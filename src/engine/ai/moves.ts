// Heuristic miracle moves used by the planner to build candidate plans.
// Pure functions of the state; no randomness here.

import { MIRACLE_BY_ID } from '../../data/miracles.ts';
import { miracleTargets } from '../actions.ts';
import { isVegetal } from '../conditions.ts';
import { neighborsOf } from '../grid.ts';
import type { Cell, GameState } from '../types.ts';

export interface Move {
  miracleId: string;
  index: number;
  /** Heuristic attractiveness (higher is better); only used to rank / sample moves. */
  score: number;
}

const count = (grid: readonly Cell[], index: number, pred: (c: Cell) => boolean): number =>
  neighborsOf(index).filter((n) => pred(grid[n]!)).length;

const hasWater = (grid: readonly Cell[], i: number): boolean => count(grid, i, (c) => c.element === 'water') > 0;

/** Seeds that have no Water next to them: they will wither unless a spring is placed beside them. */
function isolatedSeedNeighbors(grid: readonly Cell[], index: number): number {
  return neighborsOf(index).filter((n) => grid[n]!.element === 'seed' && !hasWater(grid, n)).length;
}

/** Forests most exposed to lightning-like events: the highest ones. */
function exposedForests(grid: readonly Cell[]): Set<number> {
  const forests = grid.map((c, i) => (c.element === 'forest' ? i : -1)).filter((i) => i >= 0);
  if (forests.length === 0) return new Set();
  const top = Math.max(...forests.map((i) => grid[i]!.altitude));
  return new Set(forests.filter((i) => grid[i]!.altitude === top));
}

/** All affordable moves with a heuristic score, for the miracle types in `allowed`. */
export function candidateMoves(state: GameState, allowed: ReadonlySet<string>): Move[] {
  const g = state.grid;
  const moves: Move[] = [];

  if (allowed.has('sow')) {
    for (const i of miracleTargets(state, 'sow')) {
      const water = count(g, i, (c) => c.element === 'water');
      const veg = count(g, i, (c) => isVegetal(c.element));
      // A seed next to Water germinates; next to vegetation it feeds Croissance clusters.
      moves.push({ miracleId: 'sow', index: i, score: water > 0 ? 3 * water + veg : 0.2 + 0.2 * veg + (g[i]!.element === 'ash' ? 0.3 : 0) });
    }
  }

  if (allowed.has('spring')) {
    for (const i of miracleTargets(state, 'spring')) {
      const isolated = isolatedSeedNeighbors(g, i);
      const open = count(g, i, (c) => c.element === 'void');
      const veg = count(g, i, (c) => isVegetal(c.element));
      moves.push({ miracleId: 'spring', index: i, score: 4 * isolated + 0.5 * open + 0.4 * veg });
    }
  }

  if (allowed.has('raise')) {
    const exposed = exposedForests(g);
    const runoff = state.grimoire.includes('ruissellement');
    for (const i of miracleTargets(state, 'raise')) {
      // Next to an exposed Forest, or (with Ruissellement) lifting a Water that borders bare ground.
      const nearExposed = neighborsOf(i).filter((n) => exposed.has(n)).length;
      const lift = runoff && g[i]!.element === 'water' ? count(g, i, (c) => c.element === 'void' && c.altitude <= g[i]!.altitude) : 0;
      const s = nearExposed + 0.8 * lift;
      if (s > 0) moves.push({ miracleId: 'raise', index: i, score: s });
    }
  }

  if (allowed.has('ignite') && state.grimoire.includes('cendre-fertile')) {
    // Controlled burn: a stagnant Plant (no Forest around) becomes Ash, then a fresh Plant.
    for (const i of miracleTargets(state, 'ignite')) {
      if (g[i]!.element !== 'plant') continue;
      if (count(g, i, (c) => c.element === 'forest') > 0) continue;
      moves.push({ miracleId: 'ignite', index: i, score: 0.5 });
    }
  }

  return moves.filter((m) => state.essence >= MIRACLE_BY_ID[m.miracleId]!.cost);
}
