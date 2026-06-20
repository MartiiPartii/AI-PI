import type { Server } from 'node:http';
import { WebSocketServer, type WebSocket } from 'ws';
import type { Config } from '../config.js';
import { createRealtimeSession } from '../openai/realtime.client.js';

/** Path Twilio's <Connect><Stream> connects to for bidirectional media. */
export const MEDIA_STREAM_PATH = '/media-stream';

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
  let streamSid: string | null = null;

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
    onClose() {
      if (twilioWs.readyState === twilioWs.OPEN) {
        twilioWs.close();
      }
    },
  });

  twilioWs.on('message', (raw) => {
    let msg: { event?: string; start?: { streamSid?: string }; media?: { payload?: string } };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    switch (msg.event) {
      case 'start':
        streamSid = msg.start?.streamSid ?? null;
        console.log(`[media] Stream started (streamSid: ${streamSid})`);
        break;
      case 'media':
        if (msg.media?.payload) {
          realtime.sendAudio(msg.media.payload);
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
