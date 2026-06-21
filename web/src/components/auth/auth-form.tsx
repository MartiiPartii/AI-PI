'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthForm, type AuthMode } from '@/client/state/use-auth-form';

/**
 * Phone + password form for login and signup (mode-driven). Thin client
 * component: it only collects input and renders state from `useAuthForm`; the
 * actual work happens in the Server Action behind it, which redirects on
 * success.
 */
export function AuthForm({ mode }: { mode: AuthMode }) {
  const { submit, pending, error } = useAuthForm(mode);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');

  const isSignup = mode === 'signup';

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit(phone, password);
      }}
      className="space-y-5"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="phone">Телефонен номер</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0888 123 456"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Парола</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          placeholder={isSignup ? 'Поне 8 символа' : 'Вашата парола'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={pending}
        />
      </div>

      {error ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      ) : null}

      <Button type="submit" size="lg" className="w-full soft" disabled={pending}>
        {pending
          ? 'Моля, изчакайте…'
          : isSignup
            ? 'Създаване на профил'
            : 'Вход'}
      </Button>
    </form>
  );
}
