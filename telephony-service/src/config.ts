/**
 * Centralised runtime configuration.
 *
 * Reading environment variables in exactly one place keeps the rest of the
 * codebase free of `process.env` lookups and makes the service easy to mock
 * and reconfigure as it grows.
 */
export interface Config {
  readonly port: number;
  /** Twilio auth token, used to validate incoming webhook signatures. */
  readonly twilioAuthToken: string;
  /**
   * Public base URL Twilio uses to reach this service (e.g. the ngrok HTTPS
   * URL). Required to reconstruct the exact URL Twilio signed.
   */
  readonly publicBaseUrl: string;
  /**
   * When true, webhook signature validation is skipped. Intended only for
   * local testing with tools like curl. Never enable in production.
   */
  readonly skipWebhookValidation: boolean;
}

export function loadConfig(): Config {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);

  if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
  }

  const skipWebhookValidation = process.env.SKIP_WEBHOOK_VALIDATION === 'true';
  const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN ?? '';
  const publicBaseUrl = process.env.PUBLIC_BASE_URL ?? '';

  if (!skipWebhookValidation) {
    if (!twilioAuthToken) {
      throw new Error('TWILIO_AUTH_TOKEN is required (or set SKIP_WEBHOOK_VALIDATION=true for local testing)');
    }
    if (!publicBaseUrl) {
      throw new Error('PUBLIC_BASE_URL is required (or set SKIP_WEBHOOK_VALIDATION=true for local testing)');
    }
  }

  return { port, twilioAuthToken, publicBaseUrl, skipWebhookValidation };
}
