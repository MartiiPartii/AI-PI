'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import type { ResultDto } from '@/schemas/result';
import { useResultsPolling } from '@/client/state/use-results-polling';
import { clearResults, deleteResult } from '@/client/actions/results';
import { Button } from '@/components/ui/button';
import { ResultCard } from './result-card';
import { SelfTest } from './self-test';

/**
 * Client shell for the dashboard. Holds the live results polling (seeded with
 * the server-rendered list) and wires the self-test's success to an immediate
 * refresh, so a just-completed test shows up in the list without waiting for
 * the next poll.
 *
 * Also owns deleting results: a per-result delete and a "clear all" (guarded by
 * an inline confirm). Both update the list optimistically and reconcile with the
 * server on success / failure.
 */
export function DashboardClient({ initial }: { initial: ResultDto[] }) {
  const { results, refresh, addResult, removeResult, clearResults: clearLocal } =
    useResultsPolling(initial);
  const [confirmingClear, setConfirmingClear] = useState(false);

  async function handleDelete(id: string) {
    removeResult(id); // drop it instantly
    const res = await deleteResult(id);
    void refresh(); // reconcile (restores it if the delete failed)
    if (!res.success) {
      // Surface failures without a heavyweight toast system.
      console.error('[dashboard] delete failed:', res.error);
    }
  }

  async function handleClearAll() {
    setConfirmingClear(false);
    clearLocal(); // empty it instantly
    const res = await clearResults();
    void refresh();
    if (!res.success) {
      console.error('[dashboard] clear all failed:', res.error);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <SelfTest
        onScored={(result) => {
          addResult(result); // show it instantly
          void refresh(); // reconcile with the server
        }}
      />

      <section aria-label="Минали резултати">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Вашите резултати</h2>

          {results.length > 0 ? (
            confirmingClear ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Сигурни ли сте?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => void handleClearAll()}
                >
                  Изтрий всички
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmingClear(false)}
                >
                  Отказ
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => setConfirmingClear(true)}
              >
                <Trash2 className="size-4" aria-hidden />
                Изчисти всички
              </Button>
            )
          ) : null}
        </div>

        {results.length === 0 ? (
          <div className="rounded-3xl bg-card p-8 text-center soft">
            <p className="text-sm text-muted-foreground">
              Все още нямате резултати. Направете тест по-горе или се обадете на
              телефонната линия.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {results.map((result) => (
              <li key={result.id}>
                <ResultCard
                  result={result}
                  onDelete={(id) => void handleDelete(id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
