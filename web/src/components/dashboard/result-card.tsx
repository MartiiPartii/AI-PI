import { Phone, Mic } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { ResultDto } from '@/schemas/result';
import { riskLabel, sourceLabel } from '@/domain/risk';

/**
 * Presentational card for a single assessment result. No data fetching or
 * logic; it just renders a DTO. Dates are formatted in the Europe/Sofia time
 * zone so server and client render identically (no hydration mismatch).
 */
const dateFormatter = new Intl.DateTimeFormat('bg-BG', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Sofia',
});

export function ResultCard({ result }: { result: ResultDto }) {
  const SourceIcon = result.source === 'phone' ? Phone : Mic;

  return (
    <Card className="rounded-2xl border-0 bg-card soft">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold tracking-tight">
              {result.riskPercent}%
            </span>
            <Badge
              className={
                result.elevated
                  ? 'bg-destructive text-destructive-foreground'
                  : 'border-transparent bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]'
              }
            >
              {riskLabel(result.elevated)}
            </Badge>
          </div>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {dateFormatter.format(new Date(result.createdAt))}
          </p>
        </div>

        <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
          <SourceIcon className="size-4" aria-hidden />
          {sourceLabel(result.source)}
        </span>
      </CardContent>
    </Card>
  );
}
