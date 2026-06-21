import { z } from 'zod';
import { ResultDtoSchema, type ResultDto } from '@/schemas/result';

/**
 * Client-side fetch of the signed-in account's results from the polling
 * endpoint. The response is validated against the schema before use.
 */
const ResultsResponseSchema = z.object({ results: z.array(ResultDtoSchema) });

export async function fetchResults(signal?: AbortSignal): Promise<ResultDto[]> {
  const res = await fetch('/api/results', { signal, cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Results request failed: ${res.status}`);
  }
  const parsed = ResultsResponseSchema.safeParse(await res.json());
  if (!parsed.success) {
    throw new Error('Invalid results response');
  }
  return parsed.data.results;
}
