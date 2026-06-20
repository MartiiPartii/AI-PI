import { Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getPhoneLine } from '@/lib/contact';
import { cn } from '@/lib/utils';

/**
 * Primary call-to-action: a `tel:` link styled as a shadcn Button.
 *
 * Server Component — the number is read from the env on the server and baked
 * into the rendered `href`/label, so the CTA needs no client JavaScript.
 */
export function CallButton({
  size = 'lg',
  variant = 'default',
  showNumber = true,
  className,
}: {
  readonly size?: 'default' | 'sm' | 'lg';
  readonly variant?: 'default' | 'secondary' | 'outline';
  /** When true, render the phone number; otherwise a short "Обадете се" label. */
  readonly showNumber?: boolean;
  readonly className?: string;
}) {
  const { tel, display } = getPhoneLine();

  return (
    <Button
      asChild
      size={size}
      variant={variant}
      className={cn('gap-2 font-semibold', className)}
    >
      <a href={`tel:${tel}`} aria-label={`Обадете се на ${display}`}>
        <Phone className="size-4" aria-hidden />
        {showNumber ? display : 'Обадете се'}
      </a>
    </Button>
  );
}
