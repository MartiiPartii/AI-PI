'use server';

import type { ApiResponse } from '@/schemas/api';
import { getAuthenticatedAccountId } from '@/services/sessionService';
import { assess, type AssessOutcome } from '@/services/assessService';

/**
 * Server Action for the web self-test: receives the recorded WAV, scores it for
 * the signed-in account, and returns the outcome so the UI can show it
 * immediately (the dashboard list is revalidated by the write).
 *
 * Authorization is from the session only — no account id is accepted from the
 * client. The upload is size-capped to avoid memory abuse.
 */

/** Max accepted upload. A 5s recording is well under this; the larger cap also
 *  comfortably fits a user-supplied .wav file while still guarding against abuse. */
const MAX_AUDIO_BYTES = 15 * 1024 * 1024; // 15 MB

export async function submitAssessment(
  formData: FormData,
): Promise<ApiResponse<AssessOutcome>> {
  const accountId = await getAuthenticatedAccountId();
  if (!accountId) {
    return { success: false, error: 'Трябва да влезете в профила си.' };
  }

  const file = formData.get('audio');
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: 'Липсва аудио запис.' };
  }
  if (file.size > MAX_AUDIO_BYTES) {
    return { success: false, error: 'Записът е твърде голям.' };
  }

  try {
    const wav = await file.arrayBuffer();
    const outcome = await assess(accountId, wav);
    return { success: true, data: outcome };
  } catch (error) {
    console.error('[assess] Scoring failed:', error);
    return { success: false, error: 'Възникна грешка при обработката. Опитайте отново.' };
  }
}
