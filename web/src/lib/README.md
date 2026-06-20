# Lib

## Purpose
Lib contains **generic utilities and helpers** used across the app.

## Responsibilities
- Shared utilities (e.g., className merging, formatting, small generic helpers).
- Helpers that are not domain-specific and not transport-specific.

## Rules
- Keep utilities small and dependency-light.
- Avoid embedding business rules here (use `src/domain` for that).

