# External

## Purpose
External is the **backend integration layer**. It isolates transport/persistence
details (database access, HTTP to other services, error normalization) from the
services layer, so services express *what* they need, not *how* it is fetched or
stored.

## Responsibilities
- Own the **database client** (`db.ts`, a shared Prisma instance) and expose
  small data-access functions per entity (`accounts.ts`, `results.ts`) — request
  in, row/DTO out. No business rules.
- Own caching of reads where it is a transport concern (e.g. `results.ts` wraps
  the per-account list in `unstable_cache` and invalidates it on write via
  `revalidateTag`).
- Provide HTTP clients for **other services** (e.g. `model.ts` → the FastAPI
  risk-scoring service). The shared `http()` helper remains available for plain
  JSON APIs.

## Rules
- No business rules (that’s `src/services` and `src/domain`).
- No React/UI code. These modules run **server-side only** (they hold DB
  credentials and call internal services).
- Inputs are assumed already validated/normalized by `services`/`domain` (e.g.
  phone numbers arrive here in E.164).
- Keep transport handling consistent (timeouts, base URLs, auth headers, error
  mapping); never expose internal services (DB, model) to the browser.

## Note on the database
This app **owns the shared database** and is its sole reader/writer. The
telephony service does not connect to Postgres directly — it POSTs scored
results to this app's internal API (`/api/results`), which writes them here.
