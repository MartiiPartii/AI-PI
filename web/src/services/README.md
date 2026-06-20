# Services

## Purpose
Services implement **all application logic** (use-cases). They are the core of the app’s behavior.

## Responsibilities
- Implement workflows (e.g., fetch, create, update).
- Orchestrate multiple operations as needed.
- Apply domain rules and transformations using `src/domain`.
- Call `src/external` to communicate with the backend.

## Rules
- No UI concerns (no React, no component state).
- No request parsing/validation (that’s `src/actions`).
- Prefer pure helpers from `src/domain` and `src/lib` for shared logic.

