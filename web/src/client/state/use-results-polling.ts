'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResultDto } from '@/schemas/result';
import { fetchResults } from '@/client/actions/results';

/**
 * Polls the results endpoint for near-real-time updates.
 *
 * Seeded with the server-rendered list (so the initial HTML already has the
 * data and there's no flash). Polling pauses while the tab is hidden to avoid
 * needless requests, and resumes — with an immediate refresh — on return.
 * The endpoint's read is cached per account, so idle polls are cheap.
 */
const POLL_INTERVAL_MS = 4000;

export function useResultsPolling(initial: ResultDto[]) {
  const [results, setResults] = useState<ResultDto[]>(initial);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      const next = await fetchResults(signal);
      setResults(next);
    } catch {
      // Transient failure (offline, navigation) — keep the last good list.
    }
  }, []);

  /**
   * Optimistically add a just-created result (e.g. from a self-test) so it
   * shows instantly; the next poll reconciles with the server. De-duplicated by
   * id in case the poll already picked it up.
   */
  const addResult = useCallback((result: ResultDto) => {
    setResults((prev) =>
      prev.some((r) => r.id === result.id) ? prev : [result, ...prev],
    );
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const start = () => {
      if (timerRef.current) return;
      timerRef.current = setInterval(() => void refresh(controller.signal), POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };

    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        void refresh(controller.signal);
        start();
      }
    };

    start();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      controller.abort();
    };
  }, [refresh]);

  return { results, refresh, addResult };
}
