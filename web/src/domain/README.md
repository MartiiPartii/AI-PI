# Domain

## Purpose
Domain contains **pure domain logic**: rules, constants, and functions that model the problem space without frameworks.

## Responsibilities
- Domain constants/enums.
- Pure helpers that encode business meaning.
- Invariants that can be shared across services and validation.

## Rules
- No side effects (no HTTP, no storage, no React).
- Keep domain logic reusable and deterministic.

