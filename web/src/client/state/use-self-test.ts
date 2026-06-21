'use client';

import { useCallback, useRef, useState } from 'react';
import { recordWav } from '@/lib/recorder';
import { submitSelfTest } from '@/client/actions/assess';
import type { AssessOutcome } from '@/services/assessService';
import type { ResultDto } from '@/schemas/result';

/**
 * Drives the web self-test flow:
 *   idle → countdown (2s) → recording (5s) → processing → done | error
 *
 * On a successful score it calls `onScored` with the newly stored result so the
 * dashboard can show it in the list immediately (polling then reconciles).
 */
export const COUNTDOWN_SECONDS = 2;
export const RECORD_MS = 5000;

export type SelfTestPhase =
  | 'idle'
  | 'countdown'
  | 'recording'
  | 'processing'
  | 'done'
  | 'error';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useSelfTest(onScored?: (result: ResultDto) => void) {
  const [phase, setPhase] = useState<SelfTestPhase>('idle');
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [outcome, setOutcome] = useState<AssessOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runningRef = useRef(false);

  const reset = useCallback(() => {
    setPhase('idle');
    setOutcome(null);
    setError(null);
    setCountdown(COUNTDOWN_SECONDS);
  }, []);

  /** Shared tail: score a WAV (recorded or uploaded), persist, surface result. */
  const scoreAndFinish = useCallback(
    async (wav: Blob) => {
      setPhase('processing');
      const res = await submitSelfTest(wav);
      if (!res.success) {
        setError(res.error);
        setPhase('error');
        return;
      }
      setOutcome(res.data);
      setPhase('done');
      if (res.data.status === 'scored') {
        onScored?.(res.data.result);
      }
    },
    [onScored],
  );

  /** Record path: 2s countdown → 5s recording → score. */
  const start = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setOutcome(null);
    setError(null);

    try {
      // 2-second countdown so the caller can get ready.
      setPhase('countdown');
      for (let s = COUNTDOWN_SECONDS; s > 0; s--) {
        setCountdown(s);
        await wait(1000);
      }

      // Record the sustained "ааа" for 5 seconds, then score.
      setPhase('recording');
      const wav = await recordWav(RECORD_MS);
      await scoreAndFinish(wav);
    } catch (err) {
      setError(
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Нужен е достъп до микрофона, за да направите теста.'
          : 'Възникна грешка при записа. Опитайте отново.',
      );
      setPhase('error');
    } finally {
      runningRef.current = false;
    }
  }, [scoreAndFinish]);

  /** Upload path: score a ready .wav file (no countdown/recording). */
  const submitFile = useCallback(
    async (file: File) => {
      if (runningRef.current) return;

      // Basic client-side check; the server also caps size and the model
      // rejects audio it can't read.
      const isWav =
        /\.wav$/i.test(file.name) ||
        file.type === 'audio/wav' ||
        file.type === 'audio/x-wav';
      if (!isWav) {
        setOutcome(null);
        setError('Моля, изберете файл във формат .wav.');
        setPhase('error');
        return;
      }

      runningRef.current = true;
      setOutcome(null);
      setError(null);
      try {
        await scoreAndFinish(file);
      } catch {
        setError('Възникна грешка при качването. Опитайте отново.');
        setPhase('error');
      } finally {
        runningRef.current = false;
      }
    },
    [scoreAndFinish],
  );

  return { phase, countdown, outcome, error, start, submitFile, reset };
}
