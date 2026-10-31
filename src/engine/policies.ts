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
  return neighborsOf(index, 'moore').filter((n) => state.grid[n]!.element === 'water').length;
}

function sowWhileAffordable(prev: GameState, score: (s: GameState, i: number) => number): GameState {
  let state = prev;
  const cost = MIRACLE_BY_ID['sow']!.cost;
  while (state.essence >= cost) {
    const targets = miracleTargets(state, 'sow');
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
