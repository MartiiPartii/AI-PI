import 'dotenv/config';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

function main(): void {
  const config = loadConfig();
  const app = createApp(config);

  app.listen(config.port, () => {
    console.log(`[server] Telephony service listening on http://localhost:${config.port}`);
    console.log(`[server] Twilio voice webhook: POST /twilio/voice`);
  });
}

main();
