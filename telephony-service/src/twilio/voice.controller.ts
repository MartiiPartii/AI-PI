import type { Request, Response } from 'express';
import twilio from 'twilio';

const { VoiceResponse } = twilio.twiml;

/**
 * The single spoken line for this milestone. Kept as a constant so the eventual
 * conversation flow can replace it with a richer, model-driven script without
 * touching the HTTP wiring.
 */
const GREETING = `Hello. This is AI-PI. Parkinson's is the second most common neurodegenerative disease in the world. And here's the nightmarish fact: by the time the doctor finally says the words "you have Parkinson's" — the patient has already lost between 50 and 70 percent of the neurons that produce dopamine. The disease doesn't start on the day of diagnosis. It starts years earlier — quietly, invisibly, in the way we speak. Have a nice day!`;

/**
 * Handles Twilio's inbound-call webhook.
 *
 * Twilio POSTs to this endpoint when a call comes in and expects TwiML
 * (XML) describing what to do. Here we simply greet the caller and hang up.
 */
export function handleInboundCall(req: Request, res: Response): void {
  const callSid = req.body?.CallSid ?? 'unknown';

  try {
    const response = new VoiceResponse();
    response.say(GREETING);
    response.hangup();

    res.type('text/xml').send(response.toString());
    console.log(`[voice] Inbound call handled successfully (CallSid: ${callSid})`);
  } catch (error) {
    console.error(`[voice] Failed to handle inbound call (CallSid: ${callSid}):`, error);
    res.status(500).send('Error handling call');
  }
}
