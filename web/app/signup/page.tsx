import Link from 'next/link';
import { HeartPulse } from 'lucide-react';
import { AuthForm } from '@/components/auth/auth-form';
import { Card, CardContent } from '@/components/ui/card';

export const metadata = { title: 'Създаване на профил — AI-PI' };

export default function SignupPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-background px-5 py-16">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="mb-8 flex items-center justify-center gap-2 font-semibold tracking-tight"
        >
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <HeartPulse className="size-5" aria-hidden />
          </span>
          <span className="text-lg">AI&#8209;PI</span>
        </Link>

        <Card className="rounded-3xl border-0 bg-card soft">
          <CardContent className="p-8">
            <div className="mb-7 text-center">
              <h1 className="text-2xl font-bold tracking-tight">Създаване на профил</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Профилът се свързва с телефонния Ви номер, за да виждате
                резултатите си от обажданията.
              </p>
            </div>

            <AuthForm mode="signup" />

            <p className="mt-5 text-center text-xs leading-relaxed text-muted-foreground">
              Засега използваме само телефон и парола. Потвърждаване на номера
              чрез SMS ще бъде добавено по-късно.
            </p>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Вече имате профил?{' '}
              <Link href="/login" className="font-medium text-primary hover:underline">
                Влезте
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
