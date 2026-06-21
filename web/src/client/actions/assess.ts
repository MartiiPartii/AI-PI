import type { ApiResponse } from '@/schemas/api';
import { submitAssessment } from '@/actions/assess';
import type { AssessOutcome } from '@/services/assessService';

/**
 * Thin client-side wrapper over the self-test Server Action. Packs the recorded
 * WAV into FormData and forwards it; no logic beyond that.
 */
export function submitSelfTest(wav: Blob): Promise<ApiResponse<AssessOutcome>> {
  const form = new FormData();
  form.append('audio', wav, 'sample.wav');
  return submitAssessment(form);
}
