import WebSocket from 'ws';
import type { Config } from '../config.js';

/**
 * Callbacks the media-stream handler provides so it can react to the Realtime
 * session without knowing anything about the OpenAI wire protocol.
 */
export interface RealtimeCallbacks {
  /** Called with a base64 G.711 μ-law audio chunk the agent wants to speak. */
  onAudio: (audioBase64: string) => void;
  /** Called when the caller starts speaking, so we can interrupt playback (barge-in). */
  onSpeechStarted: () => void;
  /** Called on a fatal error or when the session closes. */
  onClose: () => void;
}

export interface RealtimeSession {
  /** Forward a base64 G.711 μ-law audio chunk from the caller to the model. */
  sendAudio: (audioBase64: string) => void;
  /** Close the Realtime connection. */
  close: () => void;
}

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

  ws.on('open', () => {
    // Configure the session in the GA shape: audio config nested under
    // `audio.input` / `audio.output`, μ-law format objects, server-side voice
    // activity detection (with auto-interrupt), and our agent persona.
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
              turn_detection: {
                type: 'server_vad',
                create_response: true,
                interrupt_response: true,
              },
            },
            output: {
              format: { type: 'audio/pcmu' },
              voice: config.agentVoice,
            },
          },
        },
      }),
    );

    // Have the agent greet the caller first rather than waiting for them to speak.
    ws.send(JSON.stringify({ type: 'response.create' }));
    console.log('[openai] Realtime session opened');
  });

  ws.on('message', (raw) => {
    let event: { type?: string; delta?: string; error?: unknown };
    try {
      event = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (event.type) {
      case 'response.output_audio.delta':
        if (typeof event.delta === 'string') {
          callbacks.onAudio(event.delta);
        }
        break;
      case 'input_audio_buffer.speech_started':
        // Caller interrupted. Cancel the in-progress response so the agent
        // stops generating, and let the handler clear Twilio's playback buffer.
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'response.cancel' }));
        }
        callbacks.onSpeechStarted();
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
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input_audio_buffer.append', audio: audioBase64 }));
      }
    },
    close(): void {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    },
  };
}
