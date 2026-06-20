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
  /** OpenAI API key, used for the GPT Realtime speech-to-speech conversation. */
  readonly openaiApiKey: string;
  /** OpenAI Realtime model id (speech-to-speech). */
  readonly openaiRealtimeModel: string;
  /** Voice the Realtime agent speaks with. */
  readonly agentVoice: string;
  /** System instructions defining the agent's persona and conversation flow. */
  readonly agentInstructions: string;
}

/**
 * The agent's persona and conversation script. Kept here for now so the
 * thin-slice prototype is self-contained; the eventual assessment flow
 * (sustained-vowel capture, scoring, result delivery) will extend this.
 */
const DEFAULT_AGENT_INSTRUCTIONS = `You are the voice agent for AI-PI, a free phone-based early screening service for Parkinson's disease risk.

LANGUAGE: Speak Bulgarian by default. Your very first greeting and all of your replies must be in Bulgarian unless the caller asks otherwise. If the caller asks you to speak another language, or clearly addresses you in another language and asks you to switch, switch to that language and continue the conversation in it for as long as they want. You can change languages again at any time if they ask. Always start each new call in Bulgarian.

Your callers are often elderly or not technical. Speak slowly, warmly, and in short, plain sentences. Be patient. If the caller seems confused, asks you to repeat, or talks over you, gently re-explain in simpler words and give them time.

Open the call by greeting them, briefly explaining that AI-PI offers a short voice-based check that may indicate Parkinson's disease risk, and making clear this is only a screening — not a medical diagnosis — and that they should always see a doctor for any health concerns. Ask for their spoken consent to continue before doing anything else.

For now (this is an early prototype) you are only having a friendly conversation to test the phone line. Do not attempt the actual voice assessment yet. If they ask what to do, reassure them the full assessment is coming soon and chat with them kindly.`;

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

  const openaiApiKey = process.env.OPENAI_API_KEY ?? '';
  const openaiRealtimeModel = process.env.OPENAI_REALTIME_MODEL ?? 'gpt-realtime';
  const agentVoice = process.env.AGENT_VOICE ?? 'alloy';
  const agentInstructions = process.env.AGENT_INSTRUCTIONS ?? DEFAULT_AGENT_INSTRUCTIONS;

  return {
    port,
    twilioAuthToken,
    publicBaseUrl,
    skipWebhookValidation,
    openaiApiKey,
    openaiRealtimeModel,
    agentVoice,
    agentInstructions,
  };
}
