'use server';

import type { ApiResponse } from '@/schemas/api';
import { DeleteResultSchema } from '@/schemas/result';
import { getAuthenticatedAccountId } from '@/services/sessionService';
import { clearForAccount, deleteForAccount } from '@/services/resultsService';

/**
 * Server Actions for managing the signed-in account's results: deleting a single
 * result or clearing all of them.
 *
 * Authorization is from the session only — the account id is never accepted from
 * the client, and deletes are scoped to that account in the data layer so one
 * user can never remove another's results.
 */

export async function deleteResult(
  input: unknown,
): Promise<ApiResponse<{ id: string }>> {
  const accountId = await getAuthenticatedAccountId();
  if (!accountId) {
    return { success: false, error: 'Трябва да влезете в профила си.' };
  }

  const parsed = DeleteResultSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: 'Невалидна заявка.' };
  }

  const removed = await deleteForAccount(accountId, parsed.data.id);
  if (!removed) {
    return { success: false, error: 'Резултатът не е намерен.' };
  }
  return { success: true, data: { id: parsed.data.id } };
}

export async function clearResults(): Promise<ApiResponse<{ cleared: number }>> {
  const accountId = await getAuthenticatedAccountId();
  if (!accountId) {
    return { success: false, error: 'Трябва да влезете в профила си.' };
  }

  const cleared = await clearForAccount(accountId);
  return { success: true, data: { cleared } };
}
