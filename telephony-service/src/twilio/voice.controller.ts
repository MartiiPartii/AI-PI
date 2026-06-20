import type { Request, RequestHandler, Response } from 'express';
import twilio from 'twilio';
import type { Config } from '../config.js';
import { MEDIA_STREAM_PATH } from './media-stream.handler.js';

const { VoiceResponse } = twilio.twiml;

/**
 * Derives the public `wss://` URL Twilio should open a Media Stream to, from the
 * configured public base URL (e.g. `https://x.ngrok-free.app` → `wss://x.ngrok-free.app/media-stream`).
 */
function buildStreamUrl(publicBaseUrl: string): string {
  const base = publicBaseUrl.replace(/^http/, 'ws').replace(/\/$/, '');
  return `${base}${MEDIA_STREAM_PATH}`;
}

/**
 * Builds the handler for Twilio's inbound-call webhook.
 *
 * Twilio POSTs here when a call comes in and expects TwiML. We respond with
 * `<Connect><Stream>`, which opens a bidirectional Media Stream to our
 * WebSocket — that stream is then bridged to the GPT Realtime agent.
 */
export function createInboundCallHandler(config: Config): RequestHandler {
  return function handleInboundCall(req: Request, res: Response): void {
    const callSid = req.body?.CallSid ?? 'unknown';

    if (!config.publicBaseUrl) {
      console.error(`[voice] PUBLIC_BASE_URL is not set; cannot start Media Stream (CallSid: ${callSid})`);
      res.status(500).send('Server misconfigured: PUBLIC_BASE_URL required');
      return;
    }

    try {
      const response = new VoiceResponse();
      const connect = response.connect();
      const stream = connect.stream({ url: buildStreamUrl(config.publicBaseUrl) });

      // Pass the caller's number (and the number they dialled) into the Media
      // Stream so the websocket handler can text the result SMS afterwards.
      // Twilio surfaces these in the stream's `start.customParameters`.
      const caller = req.body?.From;
      const called = req.body?.To;
      if (caller) {
        stream.parameter({ name: 'caller', value: caller });
      }
      if (called) {
        stream.parameter({ name: 'called', value: called });
      }

      res.type('text/xml').send(response.toString());
      console.log(`[voice] Inbound call connected to Media Stream (CallSid: ${callSid})`);
    } catch (error) {
      console.error(`[voice] Failed to handle inbound call (CallSid: ${callSid}):`, error);
      res.status(500).send('Error handling call');
    }
  };
}
