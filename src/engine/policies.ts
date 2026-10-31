// Simple automatic players. Used by the balance simulator, and a seed for a future idle mode.

import { GRIMOIRE_SLOTS } from '../data/constants.ts';
import { MIRACLE_BY_ID } from '../data/miracles.ts';
import { castMiracle, miracleTargets, skipDraft, takeDraftLaw } from './actions.ts';
import { neighborsOf } from './grid.ts';
import { runSeason } from './season.ts';
import { newGame } from './state.ts';
import type { GameState } from './types.ts';

/** A policy plays one whole intervention phase (draft, grimoire, miracles). */
export type Policy = (state: GameState) => GameState;

function waterNeighbors(state: GameState, index: number): number {
  return neighborsOf(index).filter((n) => state.grid[n]!.element === 'water').length;
}

function sowWhileAffordable(
  prev: GameState,
  score: (s: GameState, i: number) => number,
  minScore = -Infinity,
): GameState {
  let state = prev;
  const cost = MIRACLE_BY_ID['sow']!.cost;
  while (state.essence >= cost) {
    const targets = miracleTargets(state, 'sow').filter((i) => score(state, i) >= minScore);
    if (targets.length === 0) break;
    // Best score, ties → lowest index (deterministic).
    const best = targets.reduce((a, b) => (score(state, b) > score(state, a) ? b : a));
    state = castMiracle(state, 'sow', best);
  }
  return state;
}

/** Take the first offered law (skip if the grimoire is full), sow near water while Essence lasts. */
export const naivePolicy: Policy = (prev) => {
  let state = prev;
  if (state.draft && state.grimoire.length < GRIMOIRE_SLOTS) state = takeDraftLaw(state, state.draft[0]!);
  else if (state.draft) state = skipDraft(state);
  return sowWhileAffordable(state, (s, i) => waterNeighbors(s, i));
};

/** Play a full game with a policy. Returns the final state. */
export function playGame(seed: number, policy: Policy): GameState {
  let state = newGame(seed);
  while (state.phase === 'intervention') {
    state = policy(state);
    state = runSeason(state).state;
  }
  return state;
}

/** Draft preference, best first (laws not listed are never replaced). */
export const LAW_PRIORITY = [
  'dissemination',
  'vent-ouest',
  'pollen',
  'cendre-fertile',
  'offrande',
  'sources-sacrees',
  'lichen',
  'mangrove',
  'cycle-cendres',
  'ruissellement',
  'racines-humides',
  'erosion',
  'pluie-cimes',
  'foudre',
];

/** Slightly smarter reference player: ranks laws by a fixed list, sows next to water and vegetation. */
export const greedyPolicy: Policy = (prev) => {
  let state = prev;
  if (state.draft) {
    const rank = (id: string) => LAW_PRIORITY.indexOf(id);
    const best = [...state.draft].sort((a, b) => rank(a) - rank(b))[0]!;
    if (state.grimoire.length < GRIMOIRE_SLOTS) state = takeDraftLaw(state, best);
    else {
      const worst = state.grimoire.reduce((w, id, i) => (rank(id) > rank(state.grimoire[w]!) && rank(id) >= 0 ? i : w), 0);
      const replaceable = rank(state.grimoire[worst]!) > rank(best) && rank(state.grimoire[worst]!) >= 0;
      state = replaceable ? takeDraftLaw(state, best, worst) : skipDraft(state);
    }
  }
  const sowScore = (s: GameState, i: number) => {
    const veg = neighborsOf(i).filter((n) => ['plant', 'forest'].includes(s.grid[n]!.element)).length;
    return waterNeighbors(s, i) * 3 + veg;
  };
  // A seed with no Water next to it can never germinate: only sow where it can.
  // When the shore is full, open a new spring in the widest bare area to create fresh shore.
  for (let guard = 0; guard < 20; guard++) {
    state = sowWhileAffordable(state, sowScore, 3);
    const springs = miracleTargets(state, 'spring');
    if (springs.length === 0 || state.essence < MIRACLE_BY_ID['spring']!.cost + 3 * MIRACLE_BY_ID['sow']!.cost) break;
    const open = (i: number) => neighborsOf(i).filter((n) => state.grid[n]!.element === 'void').length;
    const best = springs.reduce((a, b) => (open(b) > open(a) ? b : a));
    state = castMiracle(state, 'spring', best);
  }
  return state;
};
