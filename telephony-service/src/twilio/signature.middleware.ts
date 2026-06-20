import type { NextFunction, Request, Response } from 'express';
import twilio from 'twilio';
import type { Config } from '../config.js';

/**
 * Express middleware that verifies the `X-Twilio-Signature` header on incoming
 * webhooks, proving the request genuinely originated from Twilio.
 *
 * Twilio signs the full public URL plus the POST parameters using the account
 * auth token. We reconstruct that exact URL from the configured public base
 * URL so validation works correctly even behind a tunnel/proxy (where the
 * locally observed protocol and host differ from what Twilio called).
 *
 * @see https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function createSignatureValidator(config: Config) {
  return function validateTwilioSignature(req: Request, res: Response, next: NextFunction): void {
    if (config.skipWebhookValidation) {
      console.warn('[security] Webhook signature validation is DISABLED (local testing only)');
      next();
      return;
    }

    const signature = req.header('X-Twilio-Signature') ?? '';
    const url = `${config.publicBaseUrl.replace(/\/$/, '')}${req.originalUrl}`;
    const params = (req.body ?? {}) as Record<string, string>;

    const isValid = twilio.validateRequest(config.twilioAuthToken, signature, url, params);

    if (!isValid) {
      console.error(`[security] Rejected request with invalid Twilio signature (url: ${url})`);
      res.status(403).send('Invalid Twilio signature');
      return;
    }

    next();
  };
}
