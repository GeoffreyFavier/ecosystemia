// Per-game diagnostics for balancing. Pure: replays whole games through the engine and reads the journals.

import { runSeason } from './season.ts';
import { isVegetal } from './conditions.ts';
import { newGame } from './state.ts';
import type { Policy } from './policies.ts';
import type { GameState } from './types.ts';

export interface GameReport {
  seed: number;
  won: boolean;
  /** Season in which the game ended. */
  endSeason: number;
  lossReason: GameState['lossReason'];
  finalEssence: number;
  finalVegetal: number;
  finalForests: number;
  grimoire: string[];
  /** Plants created (from any law). */
  plantsCreated: number;
  /** Plants that became a Forest. */
  plantsGrown: number;
  /** Plants that burned before ever growing. */
  plantsBurned: number;
  /** Plants still Plants when the game ended. */
  plantsStagnant: number;
  /** Plants that never became a Forest (burned + stagnant). */
  plantsNeverForest: number;
  /** Vegetal cells (Plant or Forest) turned to Fire, by any cause. */
  vegetalBurned: number;
  forestsBurned: number;
  seedsWithered: number;
  /** Essence spent per miracle id. */
  essenceSpent: Record<string, number>;
  /** Times each miracle was cast. */
  miraclesCast: Record<string, number>;
}

/** Play a whole game with a policy and collect diagnostics. */
export function playGameDetailed(seed: number, policy: Policy): GameReport {
  let state = newGame(seed);
  const r: GameReport = {
    seed,
    won: false,
    endSeason: 1,
    lossReason: null,
    finalEssence: 0,
    finalVegetal: 0,
    finalForests: 0,
    grimoire: [],
    plantsCreated: 0,
    plantsGrown: 0,
    plantsBurned: 0,
    plantsStagnant: 0,
    plantsNeverForest: 0,
    vegetalBurned: 0,
    forestsBurned: 0,
    seedsWithered: 0,
    essenceSpent: {},
    miraclesCast: {},
  };
  while (state.phase === 'intervention') {
    state = policy(state);
    for (const m of state.miracles) {
      r.essenceSpent[m.miracleId] = (r.essenceSpent[m.miracleId] ?? 0) + m.cost;
      r.miraclesCast[m.miracleId] = (r.miraclesCast[m.miracleId] ?? 0) + 1;
    }
    const run = runSeason(state);
    for (const cycle of run.cycles) {
      for (const e of cycle.events) {
        if (e.to === 'plant') r.plantsCreated++;
        if (e.from === 'plant' && e.to === 'forest') r.plantsGrown++;
        if (e.from === 'plant' && e.to === 'fire') r.plantsBurned++;
        if (isVegetal(e.from) && e.to === 'fire') r.vegetalBurned++;
        if (e.from === 'forest' && e.to === 'fire') r.forestsBurned++;
        if (e.lawId === 'wither') r.seedsWithered++;
      }
    }
    state = run.state;
  }
  r.won = state.phase === 'won';
  r.endSeason = state.season;
  r.lossReason = state.lossReason;
  r.finalEssence = state.essence;
  r.finalVegetal = state.grid.filter((c) => isVegetal(c.element)).length;
  r.finalForests = state.grid.filter((c) => c.element === 'forest').length;
  r.grimoire = [...state.grimoire];
  r.plantsStagnant = state.grid.filter((c) => c.element === 'plant').length;
  r.plantsNeverForest = r.plantsBurned + r.plantsStagnant;
  return r;
}
