import { z } from 'zod';
import { ResultDtoSchema, type ResultDto } from '@/schemas/result';
import type { ApiResponse } from '@/schemas/api';
import {
  clearResults as clearResultsAction,
  deleteResult as deleteResultAction,
} from '@/actions/results';

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

/** Deletes a single result for the signed-in account. */
export function deleteResult(id: string): Promise<ApiResponse<{ id: string }>> {
  return deleteResultAction({ id });
}

/** Clears all results for the signed-in account. */
export function clearResults(): Promise<ApiResponse<{ cleared: number }>> {
  return clearResultsAction();
}
