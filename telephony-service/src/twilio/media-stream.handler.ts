import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import twilio from 'twilio';
import type { Config } from '../config.js';
import { createRealtimeSession } from '../openai/realtime.client.js';
import { generateBeepFrames } from '../audio/beep.js';
import { saveRecording } from '../audio/recording.js';
import { frameRms } from '../audio/mulaw.js';
import { scorePhonation } from '../model/risk-client.js';

/** Path Twilio's <Connect><Stream> connects to for bidirectional media. */
export const MEDIA_STREAM_PATH = '/media-stream';

/** Mark name used to detect when the goodbye audio has finished playing. */
const HANGUP_MARK = 'hangup';

/** Mark name used to detect when the start beep has finished playing. */
const BEEP_DONE_MARK = 'beep-done';

/** Pre-rendered start-beep frames (format is call-independent, so build once). */
const BEEP_FRAMES = generateBeepFrames();

/**
 * RMS amplitude (linear PCM units) a frame must exceed to count as voiced. Line
 * noise and silence sit well below this; a sustained "ahhh" sits well above it.
 */
const VOICE_ONSET_RMS = 800;

/**
 * Consecutive voiced frames required to confirm onset (~60 ms at 20 ms/frame).
 * Avoids triggering on a single click or line pop.
 */
const VOICE_ONSET_FRAMES = 3;

/**
 * How many recent frames to keep as pre-roll before the detected onset (~100 ms
 * at 20 ms/frame), so the very start of the vowel isn't clipped.
 */
const ONSET_PREROLL_FRAMES = 5;

/**
 * Max time to wait for the caller to start phonating after the beep. If they
 * never do (silence, confusion), we record from here anyway so the agent still
 * gets a result and can re-explain.
 */
const ONSET_TIMEOUT_MS = 8000;

/** Phase of the phonation capture for a single call. */
type CapturePhase = 'idle' | 'waiting' | 'recording';

/**
 * Attaches a WebSocket server for Twilio Media Streams to the HTTP server.
 *
 * Each inbound call opens one WebSocket here; we open a matching OpenAI Realtime
 * session and relay audio between them. This is the thin-slice bridge — no
 * phonation capture or scoring yet.
 */
export function registerMediaStream(server: Server, config: Config): void {
  const wss = new WebSocketServer({ server, path: MEDIA_STREAM_PATH });

  wss.on('connection', (twilioWs) => {
    handleConnection(twilioWs, config);
  });

  console.log(`[media] Media Stream websocket listening on ${MEDIA_STREAM_PATH}`);
}

function handleConnection(twilioWs: WebSocket, config: Config): void {
  // Twilio identifies a stream by streamSid; we need it to send audio back.
  // callSid identifies the call itself, needed to end it via the REST API.
  let streamSid: string | null = null;
  let callSid: string | null = null;

  // Phonation-capture state. The capture runs as a small phase machine:
  //   idle      → not capturing; caller audio flows to the model as normal.
  //   waiting   → beep finished; watching inbound audio for voice onset. Frames
  //               are kept as pre-roll but the fixed window hasn't started yet.
  //   recording → onset detected (or wait timed out); buffering the sustained
  //               vowel for `captureDurationMs` from the actual start.
  // Throughout waiting/recording, caller audio is withheld from the model so the
  // Realtime VAD doesn't react to the "ahhh". `captureCallId` is the tool call
  // we must answer with the score.
  let capturePhase: CapturePhase = 'idle';
  let captureChunks: Buffer[] = [];
  let preRoll: Buffer[] = [];
  let voicedRun = 0;
  let captureCallId: string | null = null;
  let captureTimer: NodeJS.Timeout | null = null;

  /** Whether inbound caller audio should be diverted from the model right now. */
  function isCapturing(): boolean {
    return capturePhase !== 'idle';
  }

  /** Cancels any in-flight capture (e.g. the call ended mid-recording). */
  function cancelCapture(): void {
    if (captureTimer) {
      clearTimeout(captureTimer);
      captureTimer = null;
    }
    capturePhase = 'idle';
    captureChunks = [];
    preRoll = [];
    voicedRun = 0;
    captureCallId = null;
  }

  /** Plays the start beep, then a mark so we know when it has finished. */
  function playBeep(): void {
    if (!streamSid) {
      return;
    }
    for (const payload of BEEP_FRAMES) {
      twilioWs.send(JSON.stringify({ event: 'media', streamSid, media: { payload } }));
    }
    twilioWs.send(JSON.stringify({ event: 'mark', streamSid, mark: { name: BEEP_DONE_MARK } }));
  }

  /** Begins watching inbound audio for the caller to start phonating. */
  function startWaitingForOnset(): void {
    capturePhase = 'waiting';
    captureChunks = [];
    preRoll = [];
    voicedRun = 0;
    console.log('[capture] Beep done; waiting for voice onset');
    // Safety net: if the caller never starts, record from here anyway so the
    // agent still gets a (likely silent) result and can re-explain.
    captureTimer = setTimeout(() => {
      console.warn('[capture] Voice onset not detected; recording anyway');
      startRecording();
    }, ONSET_TIMEOUT_MS);
  }

  /** Opens the fixed-length recording window, seeded with the onset pre-roll. */
  function startRecording(): void {
    if (captureTimer) {
      clearTimeout(captureTimer);
      captureTimer = null;
    }
    capturePhase = 'recording';
    captureChunks = preRoll;
    preRoll = [];
    console.log(`[capture] Voice onset; recording phonation for ${config.captureDurationMs}ms`);
    captureTimer = setTimeout(() => {
      void finishCapture();
    }, config.captureDurationMs);
  }

  /**
   * Handles one inbound caller frame while a capture is active: detects onset
   * during `waiting`, and accumulates the sample during `recording`.
   */
  function handleCaptureFrame(frame: Buffer): void {
    if (capturePhase === 'recording') {
      captureChunks.push(frame);
      return;
    }
    // waiting: keep a short rolling pre-roll and look for sustained voiced audio.
    preRoll.push(frame);
    if (preRoll.length > ONSET_PREROLL_FRAMES) {
      preRoll.shift();
    }
    voicedRun = frameRms(frame) >= VOICE_ONSET_RMS ? voicedRun + 1 : 0;
    if (voicedRun >= VOICE_ONSET_FRAMES) {
      startRecording();
    }
  }

  /** Closes the recording window, scores the sample, and returns it to the agent. */
  async function finishCapture(): Promise<void> {
    capturePhase = 'idle';
    captureTimer = null;
    voicedRun = 0;
    preRoll = [];
    const callId = captureCallId;
    captureCallId = null;

    const audio = Buffer.concat(captureChunks);
    captureChunks = [];
    console.log(`[capture] Captured ${audio.length} bytes of phonation; scoring`);

    // Development-only: persist the sample so we can listen back to what was
    // captured. Guarded so production never writes call audio to disk.
    if (config.saveRecordings) {
      void saveRecording(audio, callSid);
    }

    if (!callId) {
      console.warn('[capture] No tool call_id to answer; discarding result');
      return;
    }

    try {
      const assessment = await scorePhonation(audio, config);
      realtime.submitToolResult(callId, assessment);
    } catch (error) {
      console.error('[capture] Scoring failed:', error);
      realtime.submitToolResult(callId, { error: 'scoring_failed' });
    }
  }

  const realtime = createRealtimeSession(config, {
    onAudio(audioBase64) {
      if (streamSid) {
        twilioWs.send(
          JSON.stringify({ event: 'media', streamSid, media: { payload: audioBase64 } }),
        );
      }
    },
    onSpeechStarted() {
      // Caller started talking — stop any audio Twilio is still playing (barge-in).
      if (streamSid) {
        twilioWs.send(JSON.stringify({ event: 'clear', streamSid }));
      }
    },
    onBeginCapture(callId) {
      // Agent finished instructing the caller and wants the sample. Remember the
      // tool call to answer, then play the beep. When Twilio echoes the beep-done
      // mark we start watching for voice onset, and the fixed recording window
      // begins only once the caller actually starts phonating — so their
      // reaction-time silence doesn't eat into (and clip) the sample.
      captureCallId = callId;
      playBeep();
    },
    onEndCall() {
      // The agent finished saying goodbye and wants to hang up. Send a mark so
      // we can wait until the goodbye audio already queued on Twilio has played
      // out, then end the call when Twilio echoes the mark back.
      if (streamSid) {
        twilioWs.send(JSON.stringify({ event: 'mark', streamSid, mark: { name: HANGUP_MARK } }));
      } else {
        void endCall(config, callSid, twilioWs);
      }
    },
    onClose() {
      if (twilioWs.readyState === twilioWs.OPEN) {
        twilioWs.close();
      }
    },
  });

  twilioWs.on('message', (raw) => {
    let msg: {
      event?: string;
      start?: { streamSid?: string; callSid?: string };
      media?: { payload?: string };
      mark?: { name?: string };
    };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.event) {
      case 'start':
        streamSid = msg.start?.streamSid ?? null;
        callSid = msg.start?.callSid ?? null;
        console.log(`[media] Stream started (streamSid: ${streamSid}, callSid: ${callSid})`);
        break;
      case 'media':
        if (msg.media?.payload) {
          if (isCapturing()) {
            // Capturing the sustained vowel: route to the capture machine and
            // keep it away from the model so the agent stays silent during the
            // test (and the VAD doesn't treat the "ahhh" as a turn).
            handleCaptureFrame(Buffer.from(msg.media.payload, 'base64'));
          } else {
            realtime.sendAudio(msg.media.payload);
          }
        }
        break;
      case 'mark':
        if (msg.mark?.name === HANGUP_MARK) {
          // The goodbye audio has finished playing — safe to hang up now.
          console.log('[media] Hangup mark reached; ending call');
          realtime.close();
          void endCall(config, callSid, twilioWs);
        } else if (msg.mark?.name === BEEP_DONE_MARK) {
          // The beep has finished playing — start listening for voice onset.
          startWaitingForOnset();
        }
        break;
      case 'stop':
        console.log(`[media] Stream stopped (streamSid: ${streamSid})`);
        cancelCapture();
        realtime.close();
        break;
    }
  });

  twilioWs.on('close', () => {
    console.log(`[media] Twilio websocket closed (streamSid: ${streamSid})`);
    cancelCapture();
    realtime.close();
  });

  twilioWs.on('error', (error) => {
    console.error('[media] Twilio websocket error:', error);
    cancelCapture();
    realtime.close();
  });
}

/**
 * Ends the Twilio call via the REST API, then closes the media websocket.
 * Falls back to just closing the socket if REST credentials/callSid are missing.
 */
async function endCall(config: Config, callSid: string | null, twilioWs: WebSocket): Promise<void> {
  if (callSid && config.twilioAccountSid && config.twilioAuthToken) {
    try {
      const rest = twilio(config.twilioAccountSid, config.twilioAuthToken);
      await rest.calls(callSid).update({ status: 'completed' });
      console.log(`[media] Call ended via REST API (callSid: ${callSid})`);
    } catch (error) {
      console.error(`[media] Failed to end call via REST API (callSid: ${callSid}):`, error);
    }
  } else {
    console.warn('[media] Cannot end call via REST (missing callSid or Twilio credentials); closing socket only');
  }

  if (twilioWs.readyState === twilioWs.OPEN) {
    twilioWs.close();
  }
}
