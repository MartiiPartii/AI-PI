'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { ApiResponse } from '@/schemas/api';
import { LoginSchema, SignupSchema } from '@/schemas/auth';
import { login, signup } from '@/services/authService';
import { endSession, startSession } from '@/services/sessionService';
import { rateLimit } from '@/lib/rate-limit';

/**
 * Auth Server Actions — the only server entry point for sign-up / log-in /
 * log-out from the UI. They validate input (Zod), apply a coarse rate limit,
 * delegate the use-case to the services layer, manage the session cookie, and
 * return a minimal, serializable result. No business logic lives here.
 */

/** Best-effort client IP for rate-limit keying (dev: usually localhost). */
async function clientIp(): Promise<string> {
  const h = await headers();
  return (
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  );
}

const RATE_LIMIT = 10; // attempts
const RATE_WINDOW_MS = 5 * 60 * 1000; // per 5 minutes

export async function signupAction(
  input: unknown,
): Promise<ApiResponse<null>> {
  const parsed = SignupSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Невалидни данни.' };
  }

  const limit = rateLimit(`signup:${await clientIp()}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return { success: false, error: 'Твърде много опити. Опитайте отново по-късно.' };
  }

  const result = await signup(parsed.data);
  if (!result.success) {
    return result;
  }

  await startSession(result.data.accountId);
  // Invalidate cached RSC so the nav and dashboard reflect the new session
  // immediately (no manual refresh needed).
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function loginAction(input: unknown): Promise<ApiResponse<null>> {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Невалидни данни.' };
  }

  const ip = await clientIp();
  const limit = rateLimit(`login:${ip}:${parsed.data.phone}`, RATE_LIMIT, RATE_WINDOW_MS);
  if (!limit.allowed) {
    return { success: false, error: 'Твърде много опити. Опитайте отново по-късно.' };
  }

  const result = await login(parsed.data);
  if (!result.success) {
    return result;
  }

  await startSession(result.data.accountId);
  revalidatePath('/', 'layout');
  redirect('/dashboard');
}

export async function logoutAction(): Promise<void> {
  await endSession();
  // Invalidate cached RSC so the nav drops the signed-in links everywhere.
  revalidatePath('/', 'layout');
  redirect('/login');
}
