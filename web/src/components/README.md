# Components

## Purpose
Components are **UI-only** building blocks.

## Responsibilities
- Render UI given props/state provided by hooks.
- Delegate all data fetching/mutations and business logic to `src/client/state`.

## Rules
- No business logic in components.
- Prefer calling a hook from `src/client/state` and rendering its returned data/handlers.
- Keep components focused on composition, accessibility, and presentation.

## Rendering & UI standards (see AGENTS.md → "Website (`web/`) Engineering Standards")
- **Server Components by default.** Write components as React Server Components unless they need interactivity, state/effects, browser APIs, or animation. Only then add `'use client'`, and keep such components thin.
- **Thin client wrappers for animation/interaction.** Animated or interactive behaviour goes in a small `'use client'` wrapper that receives already-rendered content as `children`/props from a Server Component. The information itself must be server-rendered (present in the initial HTML); never move data or real content into a client component just to animate it.
- **shadcn/ui only.** UI primitives must come from shadcn/ui (generated into `src/components/ui` via the shadcn CLI) and styled with Tailwind v4. Do not add other component libraries or hand-roll primitives shadcn already provides — compose and extend shadcn instead.
- **Design bar.** Clean, minimalist, modern (Stripe-like): restrained palette, deliberate typography/spacing, subtle purposeful motion. Respect keyboard focus, semantics, and `prefers-reduced-motion`.

