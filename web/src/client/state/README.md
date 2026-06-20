# Client / state

## Purpose
`src/client/state` holds **hooks for UI components**. This is where UI-level orchestration lives.

## Responsibilities
- Expose ready-to-render state: `data`, `status`, `error`.
- Expose UI handlers: `onSubmit`, `onClick`, etc.
- Call `src/client/actions` for server operations.
- Handle UI concerns: loading flags, optimistic updates, toasts, navigation triggers.

## Rules
- Keep business logic in `src/services`.
- Components should consume hook outputs and render; avoid duplicating logic in components.

