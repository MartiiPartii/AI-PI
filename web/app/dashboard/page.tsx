import { redirect } from 'next/navigation';
import Link from 'next/link';
import { HeartPulse, LogOut } from 'lucide-react';
import { logoutAction } from '@/actions/auth';
import { getAuthenticatedAccountId } from '@/services/sessionService';
import { listForAccount } from '@/services/resultsService';
import { Button } from '@/components/ui/button';
import { DashboardClient } from '@/components/dashboard/dashboard-client';

export const metadata = { title: 'Моите резултати — AI-PI' };

// Per-request: results are user-specific and must reflect new assessments.
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  // Defence in depth: middleware guards this route, but we still derive the
  // account from the session here and scope every query to it.
  const accountId = await getAuthenticatedAccountId();
  if (!accountId) {
    redirect('/login');
  }

  const initial = await listForAccount(accountId);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
              <HeartPulse className="size-5" aria-hidden />
            </span>
            <span className="text-lg">AI&#8209;PI</span>
          </Link>

          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm" className="gap-2">
              <LogOut className="size-4" aria-hidden />
              Изход
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Моите резултати
          </h1>
          <p className="mt-2 text-muted-foreground">
            Тук виждате резултатите от гласовите си проверки — по телефона и през
            уебсайта.
          </p>
        </div>

        <DashboardClient initial={initial} />

        <p className="mt-12 max-w-xl text-xs leading-relaxed text-muted-foreground">
          AI&#8209;PI предоставя предварителен скрининг и не поставя медицинска
          диагноза. При съмнение се консултирайте с лекар.
        </p>
      </main>
    </div>
  );
}
