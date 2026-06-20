# Client

## Purpose
Client contains **client-side orchestration** for UI: state hooks and client functions that call Server Actions.

## Sub-layers
- `src/client/state`: hooks that UI components consume.
- `src/client/actions`: client functions that call `src/actions` (Server Actions).

## Rules
- Components should not contain logic beyond rendering; they should use hooks from `src/client/state`.
- Client-side actions should be thin wrappers over Server Actions.

## Server/client boundary (see AGENTS.md → "Website (`web/`) Engineering Standards")
- This is the **client** layer: modules here run in the browser (`'use client'`). It exists precisely so the rest of the tree can stay server-rendered.
- Keep this layer thin and interactivity-focused. Do **not** fetch real page content or run business logic here — content is server-rendered and business logic lives in `src/services` (reached via Server Actions in `src/actions`).
- Animation/interaction belongs in thin client wrappers that receive server-rendered content as `children`/props; never pull data into a client component just to animate it.

