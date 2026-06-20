import 'dotenv/config';
import { createServer } from 'node:http';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { registerMediaStream } from './twilio/media-stream.handler.js';

function main(): void {
  const config = loadConfig();
  const app = createApp(config);

  // Wrap Express in a raw HTTP server so the Media Stream WebSocket can share
  // the same port via an upgrade handler.
  const server = createServer(app);
  registerMediaStream(server, config);

  if (!config.openaiApiKey) {
    console.warn('[server] OPENAI_API_KEY is not set — calls will connect but the agent cannot talk until it is provided.');
  }

  server.listen(config.port, () => {
    console.log(`[server] Telephony service listening on http://localhost:${config.port}`);
    console.log(`[server] Twilio voice webhook: POST /twilio/voice`);
  });
}

main();
