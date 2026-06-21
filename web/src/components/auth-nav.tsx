import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { getSessionAccountId } from '@/services/sessionService';
import { logoutAction } from '@/actions/auth';
import { Button } from '@/components/ui/button';

/**
 * Session-aware navigation actions, rendered on the server.
 *
 * Reads the session (signature-only, no DB) and shows links consistent with the
 * auth state: signed-in users get a dashboard link + logout; signed-out users
 * get a login link. Because it reads the cookie, any route that includes it is
 * rendered per request — that's intentional, so the nav always matches the
 * current session.
 */
export async function AuthNav() {
  const accountId = await getSessionAccountId();

  if (accountId) {
    return (
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          Моите резултати
        </Link>
        <form action={logoutAction}>
          <Button type="submit" variant="outline" size="sm" className="gap-2">
            <LogOut className="size-4" aria-hidden />
            Изход
          </Button>
        </form>
      </div>
    );
  }

  return (
    <Link
      href="/login"
      className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      Вход
    </Link>
  );
}
