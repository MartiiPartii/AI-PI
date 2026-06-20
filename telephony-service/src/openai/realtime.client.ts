import WebSocket from 'ws';
import type { Config } from '../config.js';

/**
 * Callbacks the media-stream handler provides so it can react to the Realtime
 * session without knowing anything about the OpenAI wire protocol.
 */
export interface RealtimeCallbacks {
  /** Called with a base64 G.711 μ-law audio chunk the agent wants to speak. */
  onAudio: (audioBase64: string) => void;
  /**
   * Called once the caller's speech has been confirmed (by transcript content,
   * not just a raw VAD trigger) so we can interrupt playback (barge-in).
   */
  onSpeechStarted: () => void;
  /** Called when the agent decides the conversation is over and wants to hang up. */
  onEndCall: () => void;
  /**
   * Called when the agent invokes begin_voice_capture, i.e. it has finished
   * instructing the caller and wants us to play the beep and record the
   * sustained-vowel sample. The `callId` must be passed back to
   * `submitToolResult` once scoring is done so the agent can speak the result.
   */
  onBeginCapture: (callId: string) => void;
  /** Called on a fatal error or when the session closes. */
  onClose: () => void;
}

export interface RealtimeSession {
  /** Forward a base64 G.711 μ-law audio chunk from the caller to the model. */
  sendAudio: (audioBase64: string) => void;
  /**
   * Hand the result of a tool call back to the model and prompt it to respond.
   * Used to deliver the phonation score so the agent can relay it to the caller.
   */
  submitToolResult: (callId: string, output: unknown) => void;
  /** Close the Realtime connection. */
  close: () => void;
}

/**
 * Cap on caller audio frames buffered before the session is ready. At 20 ms per
 * frame this is ~20 s of audio — far more than the brief connection setup needs,
 * but bounded so a stuck session can't grow memory without limit.
 */
const MAX_PENDING_FRAMES = 1000;

/**
 * Minimum non-whitespace transcript length to treat a VAD-detected turn as
 * real caller speech rather than a noise/line-blip false positive (e.g. a
 * stray "Is" picked up from background sound). Short enough not to block
 * genuine one-word replies like "Да" (yes), long enough to reject single
 * stray characters.
 */
const MIN_MEANINGFUL_TRANSCRIPT_LENGTH = 2;

/**
 * Opens a connection to OpenAI's GPT Realtime API (speech-to-speech, GA
 * interface) and wires it to the supplied callbacks.
 *
 * Audio in both directions is G.711 μ-law (`audio/pcmu`) at 8 kHz, which matches
 * Twilio's Media Streams format exactly — so chunks are relayed without
 * transcoding.
 *
 * @see https://developers.openai.com/api/docs/guides/realtime
 */
export function createRealtimeSession(config: Config, callbacks: RealtimeCallbacks): RealtimeSession {
  const url = `wss://api.openai.com/v1/realtime?model=${encodeURIComponent(config.openaiRealtimeModel)}`;

  // GA interface: no `OpenAI-Beta: realtime=v1` header.
  const ws = new WebSocket(url, {
    headers: {
      Authorization: `Bearer ${config.openaiApiKey}`,
    },
  });

  // Caller audio can arrive before the session is configured; queue it until the
  // session is confirmed ready, then flush so no early speech is lost.
  let sessionReady = false;
  const pendingAudio: string[] = [];
  // Whether the model currently has an in-progress response (audio playing or
  // being generated), so we know whether a cancel is needed/valid before
  // reacting to confirmed caller speech.
  let responseActive = false;

  function appendAudio(audioBase64: string): void {
    ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: audioBase64 }));
  }

  ws.on('open', () => {
    // Configure the session in the GA shape: audio config nested under
    // `audio.input` / `audio.output`, μ-law format objects, server-side voice
    // activity detection (turn segmentation only — we drive response
    // creation and barge-in ourselves once a transcript confirms real
    // speech), caller-speech transcription, and our agent persona. We wait
    // for `session.updated` before greeting (below) rather than greeting
    // here, to avoid a config race.
    ws.send(
      JSON.stringify({
        type: 'session.update',
        session: {
          type: 'realtime',
          output_modalities: ['audio'],
          instructions: config.agentInstructions,
          audio: {
            input: {
              format: { type: 'audio/pcmu' },
              // Phone audio picks up a lot of room/line noise before it ever
              // reaches the model; far_field is tuned for exactly this
              // (mic far from the speaker, background chatter) and suppresses
              // it before VAD and transcription see it.
              noise_reduction: { type: 'far_field' },
              turn_detection: {
                // Semantic VAD judges turn completion from speech content rather
                // than a fixed silence timer — better for elderly callers who
                // speak slowly and pause mid-sentence. Medium eagerness still
                // waits for them to finish, but is less likely than `low` to
                // treat background noise/side conversations as a turn.
                type: 'semantic_vad',
                eagerness: 'medium',
                // We drive response creation and barge-in ourselves (below),
                // gated on the transcript actually containing speech — a raw
                // VAD trigger on a noise blip would otherwise cut off the
                // agent and force it to re-say its whole turn from scratch.
                create_response: false,
                interrupt_response: false,
              },
              transcription: { model: 'gpt-4o-mini-transcribe' },
            },
            output: {
              format: { type: 'audio/pcmu' },
              voice: config.agentVoice,
            },
          },
          // Tools the agent can call during the conversation.
          tools: [
            {
              type: 'function',
              name: 'end_call',
              description:
                'End the phone call. Call this only after you have said goodbye to the caller and the conversation is finished.',
              parameters: { type: 'object', properties: {}, required: [] },
            },
            {
              type: 'function',
              name: 'begin_voice_capture',
              description:
                "Play the start beep and record the caller's sustained \"ahhh\" phonation for scoring. Call this only after the caller has consented, you have explained the test, and they have confirmed they are ready. Do not speak after calling it — the recording is captured automatically and you will receive the risk result to relay.",
              parameters: { type: 'object', properties: {}, required: [] },
            },
          ],
          tool_choice: 'auto',
        },
      }),
    );
    console.log('[openai] Realtime websocket open; sent session config');
  });

  ws.on('message', (raw) => {
    let event: {
      type?: string;
      delta?: string;
      transcript?: string;
      name?: string;
      call_id?: string;
      error?: unknown;
    };
    try {
      event = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (event.type) {
      case 'session.updated':
        // Config confirmed. Flush any queued caller audio, then have the agent
        // greet the caller. Guarded so this only runs on the first confirmation.
        if (!sessionReady) {
          sessionReady = true;
          for (const frame of pendingAudio) {
            appendAudio(frame);
          }
          pendingAudio.length = 0;
          // Override instructions for just this first response so the agent
          // reads the fixed greeting verbatim instead of freely generating
          // an opening line — keeps the start of every call identical.
          ws.send(
            JSON.stringify({
              type: 'response.create',
              response: {
                instructions: `Say exactly the following, word for word, with no changes, additions, or omissions: "${config.agentGreeting}"`,
              },
            }),
          );
          console.log('[openai] Realtime session ready; agent greeting');
        }
        break;
      case 'response.output_audio.delta':
        if (typeof event.delta === 'string') {
          callbacks.onAudio(event.delta);
        }
        break;
      case 'response.created':
        responseActive = true;
        break;
      case 'response.done':
        responseActive = false;
        break;
      case 'input_audio_buffer.speech_started':
        // VAD detected possible speech, but this fires on noise/line blips
        // too. We deliberately do nothing here — no clear, no cancel — and
        // wait for the transcript to confirm it was real speech (below).
        // create_response/interrupt_response are off in the session config,
        // so the server won't act on this by itself either.
        break;
      case 'response.function_call_arguments.done':
        // The agent invoked a tool.
        if (event.name === 'end_call') {
          console.log('[openai] Agent requested end_call');
          callbacks.onEndCall();
        } else if (event.name === 'begin_voice_capture') {
          console.log('[openai] Agent requested begin_voice_capture');
          if (event.call_id) {
            callbacks.onBeginCapture(event.call_id);
          } else {
            console.warn('[openai] begin_voice_capture missing call_id; cannot return result');
          }
        }
        break;
      case 'conversation.item.input_audio_transcription.completed': {
        const transcript = event.transcript?.trim() ?? '';
        console.log(`[openai] Caller said: ${transcript}`);
        if (transcript.length < MIN_MEANINGFUL_TRANSCRIPT_LENGTH) {
          // Treat as a noise/line-blip false positive: ignore it entirely,
          // leave any in-progress agent response playing uninterrupted.
          console.log('[openai] Ignoring transcript as noise (too short)');
          break;
        }
        if (responseActive) {
          ws.send(JSON.stringify({ type: 'response.cancel' }));
          responseActive = false;
        }
        callbacks.onSpeechStarted();
        ws.send(JSON.stringify({ type: 'response.create' }));
        break;
      }
      case 'response.output_audio_transcript.done':
        if (event.transcript) {
          console.log(`[openai] Agent said: ${event.transcript.trim()}`);
        }
        break;
      case 'error':
        console.error('[openai] Realtime error:', event.error);
        break;
    }
  });

  ws.on('error', (error) => {
    console.error('[openai] Realtime websocket error:', error);
    callbacks.onClose();
  });

  ws.on('close', () => {
    console.log('[openai] Realtime session closed');
    callbacks.onClose();
  });

  return {
    sendAudio(audioBase64: string): void {
      if (sessionReady && ws.readyState === WebSocket.OPEN) {
        appendAudio(audioBase64);
      } else if (pendingAudio.length < MAX_PENDING_FRAMES) {
        // Session not ready yet — buffer so the caller's opening words aren't lost.
        pendingAudio.push(audioBase64);
      }
    },
    submitToolResult(callId: string, output: unknown): void {
      if (ws.readyState !== WebSocket.OPEN) {
        return;
      }
      // Append the tool output to the conversation, then ask the model to speak
      // a response based on it (the agent relays the risk result to the caller).
      ws.send(
        JSON.stringify({
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id: callId,
            output: JSON.stringify(output),
          },
        }),
      );
      ws.send(JSON.stringify({ type: 'response.create' }));
    },
    close(): void {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    },
  };
}
