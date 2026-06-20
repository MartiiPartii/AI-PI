# Client / actions

## Purpose
Client actions are **client-side functions** that take input and call Server Actions in `src/actions`.

## Responsibilities
- Provide a stable API for hooks (e.g., `createBook(input)`).
- Forward typed input to Server Actions.
- Return results in a shape that is easy for UI hooks to consume.

## Rules
- No validation here (validate in Server Actions with `src/schemas`).
- No business logic here (belongs in `src/services`).

