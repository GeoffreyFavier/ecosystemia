import { START, START_LAWS } from '../data/constants.ts';
import { LAW_BY_ID } from '../data/laws.ts';
import { generateGrid } from './generate.ts';
import { createRng } from './rng.ts';
import type { Cell, ElementId, GameState, Law } from './types.ts';
import { drawDraft } from './draft.ts';
import { isVegetal } from './conditions.ts';

/**
 * Copy of a state that can be mutated safely. Hand-written (not structuredClone) because the AI
 * planner clones states thousands of times. Season summaries in `history` are shared: they are
 * never mutated after being pushed.
 */
export function cloneState(state: GameState): GameState {
  return {
    ...state,
    grid: state.grid.map((c) => ({ ...c })),
    grimoire: state.grimoire.slice(),
    draft: state.draft ? state.draft.slice() : null,
    miracles: state.miracles.map((m) => ({ ...m, before: { ...m.before } })),
    history: state.history.slice(),
    seasonChanges: { ...state.seasonChanges },
  };
}

export function getLaw(id: string): Law {
  const law = LAW_BY_ID[id];
  if (!law) throw new Error(`Unknown law: ${id}`);
  return law;
}

/** Create a new game from a seed. Same seed → same world and same first draft. */
export function newGame(seed: number): GameState {
  const rng = createRng(seed);
  const grid = generateGrid(rng);
  const base: GameState = {
    version: 1,
    seed,
    rng: rng.state,
    phase: 'intervention',
    lossReason: null,
    season: 1,
    cycle: 0,
    cycleInSeason: 0,
    essence: START.essence,
    grid,
    grimoire: [...START_LAWS],
    draft: null,
    miracles: [],
    history: [],
    seasonChanges: {},
    seasonEssence: 0,
    seasonStartEssence: START.essence,
  };
  return drawDraft(base);
}

export function countElement(grid: readonly Cell[], element: ElementId): number {
  return grid.filter((c) => c.element === element).length;
}

export function countVegetal(grid: readonly Cell[]): number {
  return grid.filter((c) => isVegetal(c.element)).length;
}
