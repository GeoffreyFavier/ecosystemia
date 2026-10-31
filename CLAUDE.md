# CLAUDE.md — Genèse

Prototype browser god-game (roguelite, Age I only). Game rules: `docs/GDD.md`. Open design questions / choices: `docs/QUESTIONS.md`.

## Language
- UI text: **French**. Code, identifiers, comments, commit messages: **English**. Docs: French.

## Stack
Vite + TypeScript (strict) + Preact, plain CSS with variables, Vitest.
No other dependency without asking the user first.

## Structure
- `src/engine/` — PURE deterministic simulation. No DOM, no Preact. Seeded RNG (mulberry32) stored in the state.
  State is plain JSON (serialisable). Functions are immutable-style: they return a new state.
- Map: 12×9 hex grid, pointy-top, odd-r offset storage, axial maths (`src/engine/grid.ts`). 6 equivalent neighbors; directions E, O, NE, NO, SE, SO.
- `src/data/` — elements, laws, miracles, balance constants. **Every gameplay number lives here.**
- `src/ui/` — Preact components. They read the state and call the engine; they hold no rules.
- `scripts/sim.ts` — balance simulator (no UI).
- `tests/` — Vitest tests for the engine.

## Rules for the engine
- Laws are DATA (`src/data/laws.ts`) interpreted by `src/engine/conditions.ts`. A `custom` escape hatch exists
  (registry in `src/engine/custom.ts`) but Age I uses 100 % data.
- Engine files use `.ts` import extensions and erasable syntax only (no enums / parameter properties) so that
  Node can run them directly (`node --experimental-strip-types`) for the simulator.
- Do not call `Math.random` or `Date` in the engine. All randomness goes through the state RNG.
- Per-cycle journal (`ChangeEvent`) is the contract with the UI: the UI replays it.

## Commands
- `npm run dev` — dev server
- `npm run build` — typecheck + production build
- `npm test` — Vitest (run once); `npm run test:watch`
- `npm run typecheck` — `tsc --noEmit`
- `npm run sim -- --runs 500` — balance simulation (`--policy naive|greedy`, `--seed N`)

## Conventions
- Vite `base` is `/ecosystemia/` (GitHub Pages). Deployment: `.github/workflows/deploy.yml`.
- One commit per step; keep tests green before committing.
- Ambiguous rule? Pick the simplest option, note it in `docs/QUESTIONS.md`, move on.
