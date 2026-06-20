import express, { type Express } from 'express';
import type { Config } from './config.js';
import { handleInboundCall } from './twilio/voice.controller.js';
import { createSignatureValidator } from './twilio/signature.middleware.js';

/**
 * Builds the Express application.
 *
 * Separated from the server bootstrap (`index.ts`) so the app can be imported
 * and exercised in tests without binding to a port.
 */
export function createApp(config: Config): Express {
  const app = express();

  // Twilio webhooks arrive as application/x-www-form-urlencoded.
  app.use(express.urlencoded({ extended: false }));

  // Lightweight health check, handy for uptime monitors and local sanity checks.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  // Twilio Voice inbound-call webhook, guarded by signature validation.
  const validateTwilioSignature = createSignatureValidator(config);
  app.post('/twilio/voice', validateTwilioSignature, handleInboundCall);

  return app;
}
