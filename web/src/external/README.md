# External

## Purpose
External is the **backend integration layer**. It isolates transport details (HTTP, headers, error normalization) from services.

## Responsibilities
- Provide a shared `http()` abstraction for API calls.
- Organize API functions in directories that **match the Express app structure** (e.g., `books/`, `loans/`, `users/`).
- Expose small functions that map 1:1 to backend endpoints (request in, DTO out).

## Rules
- No business rules (that’s `src/services` and `src/domain`).
- No React/UI code.
- Keep transport handling consistent (timeouts, base URL, auth headers, error mapping).

