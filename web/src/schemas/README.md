# Schemas

## Purpose
Schemas are the **single source of truth** for validation and types.

## Responsibilities
- Zod schemas for action inputs, forms, and DTO validation.
- TypeScript types inferred from schemas (`z.infer<typeof Schema>`).

## Rules
- Server Actions must validate inputs using these schemas.
- Prefer sharing schema/types across layers to avoid mismatch between UI, actions, and external DTOs.

