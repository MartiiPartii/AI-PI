# Actions (Server Actions)

## Purpose
Server Actions are the **only server-entry layer** for operations initiated from the UI.

## Responsibilities
- **Accept input** from `src/client/actions`.
- **Validate input with Zod** (using schemas from `src/schemas`).
- **Call the Services layer** (`src/services`) to execute the use-case.
- **Return a serializable result** (data + known error shape).

## Rules
- No business logic here (belongs in `src/services`).
- No direct HTTP calls here (belongs in `src/external` via services).
- Keep results consistent and minimal for UI consumption.

