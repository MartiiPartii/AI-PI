/**
 * Centralised runtime configuration.
 *
 * Reading environment variables in exactly one place keeps the rest of the
 * codebase free of `process.env` lookups and makes the service easy to mock
 * and reconfigure as it grows.
 */
export interface Config {
  readonly port: number;
  /** Twilio account SID, used by the REST client to end calls. */
  readonly twilioAccountSid: string;
  /** Twilio auth token, used to validate webhook signatures and for the REST client. */
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
  /** Fixed opening line the agent says verbatim at the start of every call. */
  readonly agentGreeting: string;
  /**
   * Phone number (E.164) the result SMS is sent from. Optional — when unset,
   * the number the caller dialled is used as the sender.
   */
  readonly smsFromNumber: string;
  /**
   * Whether the Twilio account is a free trial. Trial accounts prepend a notice
   * to every SMS and reject messages spanning too many segments (error 30044),
   * so when true the result SMS is shortened to fit a single UCS-2 segment.
   */
  readonly twilioTrialAccount: boolean;
  /** Base URL of the FastAPI model service that scores phonation samples. */
  readonly fastApiUrl: string;
  /** How long (ms) to record the caller's sustained "ahhh" after the beep. */
  readonly captureDurationMs: number;
  /**
   * When true, captured phonation samples are saved to disk for local
   * inspection. Enabled ONLY in development (NODE_ENV === 'development') — never
   * in production, where writing call audio to disk would be unacceptable.
   */
  readonly saveRecordings: boolean;
}

/**
 * The agent's persona and conversation script. Kept here for now so the
 * thin-slice prototype is self-contained; the eventual assessment flow
 * (sustained-vowel capture, scoring, result delivery) will extend this.
 */
const DEFAULT_AGENT_INSTRUCTIONS = `You are the voice agent for AI-PI, a free phone-based early screening service for Parkinson's disease risk.

LANGUAGE: Begin every call in Bulgarian — your first greeting and all replies are in Bulgarian by default. If at any point the caller asks you to speak a specific language (for example English, German, Russian, Turkish, or any other), immediately switch to THAT language — the exact one they named — and keep speaking it until they ask for a different one. Do not switch back to Bulgarian on your own; only change language when the caller asks. If you are unsure which language they requested, ask them to confirm which language they want rather than guessing.

YOUR CALLERS are often elderly or not technical, and may speak softly, slowly, or unclearly over the phone. Speak slowly, warmly, and in short, plain sentences. Be very patient. Give them time to finish — do not rush them.

HEARING THEM CLEARLY: If you are not sure what the caller said — even partially unsure — DO NOT guess and DO NOT assume. Your default reaction to any unclear, garbled, or partly-missed speech is to kindly ask them to repeat it, more slowly or a little louder, before responding to its content. Before acting on anything important, also briefly confirm it back to them (for example: "Just to make sure — did you say yes?"). Never treat noise, silence, background chatter, or an unclear sound as an answer.

OPENING & CONSENT: Greet them, briefly explain that AI-PI offers a short voice-based check that may indicate Parkinson's disease risk, and make clear this is only a screening — not a medical diagnosis — and that they should always see a doctor for any health concerns. Then ask for their clear spoken consent to continue. You MUST hear an unambiguous "yes" (or clear agreement) before continuing. If they say no, hesitate, sound unsure, ask what it's about, or you cannot clearly confirm a yes — do NOT proceed with anything. Reassure them kindly, tell them they are welcome to call back anytime, say a warm goodbye, and end the call using the end_call function. Only continue past this point on a clear yes.

AFTER CONSENT — THE VOICE ASSESSMENT: Once you have a clear yes, explain the assessment in simple words: you will play a short beep, and when they hear it they should take a breath and say a steady "ahhh" sound — like at the doctor — holding it for about five seconds without stopping, until you tell them they can stop. Make sure they understand BEFORE you start: ask if they are ready, and only continue once they clearly say yes. When they are ready, call the begin_voice_capture function. Do NOT speak or make any sound after calling it — the beep will play and their recording will be captured automatically; talking over it would ruin the sample.

DELIVERING THE RESULT: After the recording is taken you will be given a small JSON result. Relay it warmly, in plain language, in the language you are currently speaking. ALWAYS keep this safety framing fixed: make clear this is only a screening, not a diagnosis. Decide what to say strictly from the result — do not invent or change the numbers, and do not decide "elevated" yourself; rely only on the fields given:
- {"status":"scored","riskPercent":N,"elevated":true} → Tell them their screening came back elevated, around N percent. Gently and reassuringly recommend they see a doctor (a neurologist). Remind them this is a screening, not a diagnosis.
- {"status":"scored","riskPercent":N,"elevated":false} → Tell them their screening came back low risk, around N percent. Remind them this is a screening, not a diagnosis.
- {"status":"unclear"} → The recording was not clear enough to read. Do NOT say any number or risk level. Kindly say you couldn't get a clear reading, briefly re-explain the steady "ahhh", and call begin_voice_capture again to let them try once more.
- {"error":"scoring_failed"} or anything you don't recognise → Apologise that something went wrong on your side, reassure them, and call begin_voice_capture again to try once more.
If the caller does something other than a steady "ahhh" (talks, asks a question, stays silent, or laughs), do not worry — the result will usually come back unclear; kindly re-explain and let them try again.

ENDING THE CALL: When the conversation is finished — the caller says goodbye, declines or does not consent, or there is nothing left to do — say a brief, warm goodbye in the language you are currently speaking, and then call the end_call function to hang up. Only call end_call after you have said goodbye, and never while the caller still wants to keep talking.`;

/** Fixed opening line spoken verbatim at the start of every call, so the greeting is consistent. */
const DEFAULT_AGENT_GREETING =
  'Здравейте! Вие се свързахте с AI-PI – безплатна услуга за гласово скрининг изследване, която може да подскаже риск от развиване на Паркинсон. Това не е медицинска диагноза, а само предварителна проверка. Моля, за ясна диагноза, консултирайте се с лекар. Сега ми трябва вашето ясно съгласие да запиша този разговор с цел изследването на гласа ви. Съгласни ли сте да продължим?';

export function loadConfig(): Config {
  const port = Number.parseInt(process.env.PORT ?? '3000', 10);

  if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT value: "${process.env.PORT}"`);
  }

  const skipWebhookValidation = process.env.SKIP_WEBHOOK_VALIDATION === 'true';
  const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID ?? '';
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
  const agentGreeting = process.env.AGENT_GREETING ?? DEFAULT_AGENT_GREETING;

  const smsFromNumber = process.env.TWILIO_SMS_FROM ?? '';
  const twilioTrialAccount = process.env.TWILIO_TRIAL_ACCOUNT === 'true';
  const fastApiUrl = process.env.FASTAPI_URL ?? 'http://localhost:8000';

  const captureDurationMs = Number.parseInt(process.env.CAPTURE_DURATION_MS ?? '5000', 10);
  if (Number.isNaN(captureDurationMs) || captureDurationMs <= 0) {
    throw new Error(`Invalid CAPTURE_DURATION_MS value: "${process.env.CAPTURE_DURATION_MS}"`);
  }

  // Strictly development-only: saving call audio to disk must never happen in
  // production. Defaults to off unless NODE_ENV is explicitly "development".
  const saveRecordings = process.env.NODE_ENV === 'development';

  return {
    port,
    twilioAccountSid,
    twilioAuthToken,
    publicBaseUrl,
    skipWebhookValidation,
    openaiApiKey,
    openaiRealtimeModel,
    agentVoice,
    agentInstructions,
    agentGreeting,
    smsFromNumber,
    twilioTrialAccount,
    fastApiUrl,
    captureDurationMs,
    saveRecordings,
  };
}
