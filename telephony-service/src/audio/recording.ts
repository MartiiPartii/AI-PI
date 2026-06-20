import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Development-only helper for saving captured phonation samples to disk so a
 * developer can listen back to what the "ahhh" capture actually recorded.
 *
 * This must NEVER run in production — call sites guard on `config.saveRecordings`
 * (true only when NODE_ENV === 'development'). Nothing here is part of the live
 * call flow; it is purely a local debugging aid.
 *
 * The captured audio is raw 8 kHz G.711 μ-law (Twilio's wire format). We wrap it
 * in a WAV container with format tag 7 (μ-law) so the file opens and plays in any
 * standard audio player without separate decoding.
 */

/** Directory (relative to the service root) where dev recordings are written. */
const RECORDINGS_DIR = 'recordings';

const MULAW_FORMAT_TAG = 7;
const SAMPLE_RATE_HZ = 8000;
const NUM_CHANNELS = 1;
const BITS_PER_SAMPLE = 8;

/** Builds a minimal WAV (RIFF) container around raw μ-law audio bytes. */
function wrapMuLawAsWav(audio: Buffer): Buffer {
  const byteRate = (SAMPLE_RATE_HZ * NUM_CHANNELS * BITS_PER_SAMPLE) / 8;
  const blockAlign = (NUM_CHANNELS * BITS_PER_SAMPLE) / 8;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + audio.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(MULAW_FORMAT_TAG, 20);
  header.writeUInt16LE(NUM_CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE_HZ, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write('data', 36);
  header.writeUInt32LE(audio.length, 40);

  return Buffer.concat([header, audio]);
}

/**
 * Writes a captured phonation sample to `recordings/<callSid>-<timestamp>.wav`.
 *
 * Best-effort: failures are logged but never thrown, so a disk problem in local
 * dev can't disrupt the call. `callSid` is sanitised to keep the filename safe.
 */
export async function saveRecording(audio: Buffer, callSid: string | null): Promise<void> {
  if (audio.length === 0) {
    return;
  }

  try {
    const dir = path.resolve(process.cwd(), RECORDINGS_DIR);
    await mkdir(dir, { recursive: true });

    const safeCallSid = (callSid ?? 'unknown').replace(/[^a-zA-Z0-9_-]/g, '');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filePath = path.join(dir, `${safeCallSid}-${timestamp}.wav`);

    await writeFile(filePath, wrapMuLawAsWav(audio));
    console.log(`[capture] (dev) Saved recording to ${filePath}`);
  } catch (error) {
    console.error('[capture] (dev) Failed to save recording:', error);
  }
}
