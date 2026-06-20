import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import twilio from 'twilio';
import type { Config } from '../config.js';
import { createRealtimeSession } from '../openai/realtime.client.js';

/** Path Twilio's <Connect><Stream> connects to for bidirectional media. */
export const MEDIA_STREAM_PATH = '/media-stream';

/** Mark name used to detect when the goodbye audio has finished playing. */
const HANGUP_MARK = 'hangup';

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
          realtime.sendAudio(msg.media.payload);
        }
        break;
      case 'mark':
        // The goodbye audio has finished playing — safe to hang up now.
        if (msg.mark?.name === HANGUP_MARK) {
          console.log('[media] Hangup mark reached; ending call');
          realtime.close();
          void endCall(config, callSid, twilioWs);
        }
        break;
      case 'stop':
        console.log(`[media] Stream stopped (streamSid: ${streamSid})`);
        realtime.close();
        break;
    }
  });

  twilioWs.on('close', () => {
    console.log(`[media] Twilio websocket closed (streamSid: ${streamSid})`);
    realtime.close();
  });

  twilioWs.on('error', (error) => {
    console.error('[media] Twilio websocket error:', error);
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
