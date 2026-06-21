'use client';

import type { ResultDto } from '@/schemas/result';
import { useResultsPolling } from '@/client/state/use-results-polling';
import { ResultCard } from './result-card';
import { SelfTest } from './self-test';

/**
 * Client shell for the dashboard. Holds the live results polling (seeded with
 * the server-rendered list) and wires the self-test's success to an immediate
 * refresh, so a just-completed test shows up in the list without waiting for
 * the next poll.
 */
export function DashboardClient({ initial }: { initial: ResultDto[] }) {
  const { results, refresh, addResult } = useResultsPolling(initial);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
      <SelfTest
        onScored={(result) => {
          addResult(result); // show it instantly
          void refresh(); // reconcile with the server
        }}
      />

      <section aria-label="Минали резултати">
        <h2 className="mb-4 text-lg font-semibold">Вашите резултати</h2>
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
                <ResultCard result={result} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
