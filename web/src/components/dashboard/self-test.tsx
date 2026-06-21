'use client';

import { useRef } from 'react';
import { Loader2, Mic, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSelfTest } from '@/client/state/use-self-test';
import { riskLabel } from '@/domain/risk';
import type { ResultDto } from '@/schemas/result';

/**
 * Web self-test panel. A signed-in user can take the same voice screening
 * through the browser instead of the phone line. Two ways to provide the
 * sample:
 *   • Record — press the button → 2-second countdown → 5 seconds of "ааа".
 *   • Upload — choose a ready .wav file.
 * Either way the sample is scored, shown immediately, and added to the list
 * via `onScored`.
 */
export function SelfTest({ onScored }: { onScored: (result: ResultDto) => void }) {
  const { phase, countdown, outcome, error, start, submitFile, reset } =
    useSelfTest(onScored);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Record + upload controls, shown in the idle / unclear / error states. */
  function renderActions() {
    return (
      <div className="flex flex-col items-center gap-3">
        <Button size="lg" className="soft" onClick={() => void start()}>
          <Mic className="size-5" aria-hidden />
          Започни теста
        </Button>

        <span className="text-xs text-muted-foreground">или</span>

        <Button
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-4" aria-hidden />
          Качете .wav файл
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,audio/wav,audio/x-wav"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Reset the value so selecting the same file again re-triggers change.
            e.target.value = '';
            if (file) void submitFile(file);
          }}
        />
      </div>
    );
  }

  return (
    <Card className="rounded-3xl border-0 bg-card soft">
      <CardContent className="p-7">
        <h2 className="text-lg font-semibold">Направете тест сега</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Бърза гласова проверка директно през браузъра — както по телефона.
        </p>

        {/* Instructions */}
        <ol className="mt-5 space-y-2 text-sm text-muted-foreground">
          <li>1. Намерете тихо място и седнете удобно.</li>
          <li>2. Натиснете бутона и изчакайте кратко отброяване.</li>
          <li>
            3. Поемете дъх и кажете спокойно и равно „<span className="font-semibold text-foreground">ааа</span>“ около 5 секунди.
          </li>
          <li className="pt-1">
            Или качете готов <span className="font-semibold text-foreground">.wav</span> запис на продължително „ааа“.
          </li>
        </ol>

        <div className="mt-6 min-h-28 rounded-2xl bg-muted/50 p-6 text-center">
          {phase === 'idle' ? renderActions() : null}

          {phase === 'countdown' ? (
            <div>
              <p className="text-sm text-muted-foreground">Пригответе се…</p>
              <p className="mt-1 text-5xl font-bold tabular-nums">{countdown}</p>
            </div>
          ) : null}

          {phase === 'recording' ? (
            <div className="flex flex-col items-center gap-3">
              <span className="grid size-16 animate-pulse place-items-center rounded-full bg-primary/15 text-primary">
                <Mic className="size-7" aria-hidden />
              </span>
              <p className="font-medium">Запис… кажете „ааа“</p>
            </div>
          ) : null}

          {phase === 'processing' ? (
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <Loader2 className="size-7 animate-spin" aria-hidden />
              <p>Обработваме записа…</p>
            </div>
          ) : null}

          {phase === 'done' && outcome?.status === 'scored' ? (
            <div className="flex flex-col items-center gap-3">
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold tracking-tight">
                  {outcome.result.riskPercent}%
                </span>
                <Badge
                  className={
                    outcome.result.elevated
                      ? 'bg-destructive text-destructive-foreground'
                      : 'border-transparent bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))]'
                  }
                >
                  {riskLabel(outcome.result.elevated)}
                </Badge>
              </div>
              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                Това е предварителен скрининг, а не медицинска диагноза.
                {outcome.result.elevated
                  ? ' Препоръчваме да се консултирате с лекар.'
                  : ''}
              </p>
              <Button variant="outline" onClick={reset}>
                Нов тест
              </Button>
            </div>
          ) : null}

          {phase === 'done' && outcome?.status === 'unclear' ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-muted-foreground">
                Не успяхме да разчетем ясно записа. Опитайте отново със спокойно,
                равно „ааа“.
              </p>
              {renderActions()}
            </div>
          ) : null}

          {phase === 'error' ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm font-medium text-destructive">{error}</p>
              {renderActions()}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
