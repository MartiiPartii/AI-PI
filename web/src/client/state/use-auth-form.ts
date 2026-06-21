'use client';

import { useState, useTransition } from 'react';
import { submitLogin, submitSignup } from '@/client/actions/auth';

/**
 * Form state for the login/signup forms. Submits via the client action wrappers
 * and surfaces a single error message. On success the Server Action redirects,
 * so this hook only ever resolves on failure.
 */
export type AuthMode = 'login' | 'signup';

export function useAuthForm(mode: AuthMode) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(phone: string, password: string) {
    setError(null);
    startTransition(async () => {
      const action = mode === 'login' ? submitLogin : submitSignup;
      const res = await action({ phone, password });
      // A returned value means failure (success redirects server-side).
      if (res && !res.success) {
        setError(res.error);
      }
    });
  }

  return { submit, pending, error };
}
