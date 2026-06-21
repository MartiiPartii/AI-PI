import { z } from 'zod';

/**
 * Result schemas.
 *
 * `ResultDto` is the serializable shape sent to the client (dashboard + polling
 * endpoint) — note `createdAt` is an ISO string, not a `Date`.
 *
 * `IngestResultSchema` validates the body the telephony service POSTs to
 * `/api/results` when a phone-line assessment is scored.
 */

export const ResultDtoSchema = z.object({
  id: z.string(),
  riskPercent: z.number().int().min(0).max(100),
  elevated: z.boolean(),
  source: z.enum(['phone', 'web']),
  createdAt: z.string(),
});

export type ResultDto = z.infer<typeof ResultDtoSchema>;

/** Body the telephony service sends to ingest a phone-line result. */
export const IngestResultSchema = z.object({
  phone: z.string().min(4).max(20),
  riskPercent: z.number().int().min(0).max(100),
  elevated: z.boolean(),
});

export type IngestResultInput = z.infer<typeof IngestResultSchema>;
