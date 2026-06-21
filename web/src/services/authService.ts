import 'server-only';
import argon2 from 'argon2';
import type { ApiResponse } from '@/schemas/api';
import type { LoginInput, SignupInput } from '@/schemas/auth';
import { toE164 } from '@/domain/phone';
import {
  createAccount,
  findAccountByPhone,
} from '@/external/accounts';

/**
 * Authentication use-cases: sign-up and log-in with phone + password.
 *
 * Security notes:
 * - Passwords are hashed with argon2id (memory-hard); plaintext is never stored
 *   or logged.
 * - Log-in returns a single generic error for "no such account" and "wrong
 *   password" so the form can't be used to discover which numbers are
 *   registered, and runs a dummy verify when the account is missing to keep the
 *   response time roughly constant (no timing oracle).
 * - The phone is normalized to E.164 before any DB/hash work, so it matches the
 *   key the telephony service uses.
 */

const ARGON2_OPTS: argon2.Options = { type: argon2.argon2id };

/** A valid argon2id hash of a random string, used to equalize timing on
 *  "account not found". Computed once, lazily. */
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  dummyHashPromise ??= argon2.hash('timing-equalizer-not-a-real-password', ARGON2_OPTS);
  return dummyHashPromise;
}

const GENERIC_LOGIN_ERROR = 'Грешен телефонен номер или парола.';

export async function signup(
  input: SignupInput,
): Promise<ApiResponse<{ accountId: string }>> {
  const phone = toE164(input.phone);
  if (!phone) {
    return { success: false, error: 'Невалиден телефонен номер.' };
  }

  const existing = await findAccountByPhone(phone);
  if (existing) {
    return {
      success: false,
      error: 'Вече има профил с този телефонен номер.',
    };
  }

  const passwordHash = await argon2.hash(input.password, ARGON2_OPTS);
  const account = await createAccount({ phone, passwordHash });
  return { success: true, data: { accountId: account.id } };
}

export async function login(
  input: LoginInput,
): Promise<ApiResponse<{ accountId: string }>> {
  const phone = toE164(input.phone);
  if (!phone) {
    return { success: false, error: GENERIC_LOGIN_ERROR };
  }

  const account = await findAccountByPhone(phone);
  if (!account) {
    // Verify against a dummy hash so a missing account isn't faster than a
    // wrong password (timing-attack mitigation), then fail generically.
    await argon2.verify(await getDummyHash(), input.password).catch(() => false);
    return { success: false, error: GENERIC_LOGIN_ERROR };
  }

  const ok = await argon2
    .verify(account.passwordHash, input.password)
    .catch(() => false);
  if (!ok) {
    return { success: false, error: GENERIC_LOGIN_ERROR };
  }

  return { success: true, data: { accountId: account.id } };
}
