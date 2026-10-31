// Season lifecycle: launch → 8 cycles → finish (essence, objective, defeat, next draft).

import {
  CYCLES_PER_SEASON,
  ESSENCE_PER_FOREST,
  ESSENCE_PER_PLANT,
  GOAL,
  MAX_SEASONS,
  STAR_THRESHOLDS,
} from '../data/constants.ts';
import { MIRACLES } from '../data/miracles.ts';
import { ruleApplies } from './conditions.ts';
import { stepCycle } from './cycle.ts';
import { drawDraft } from './draft.ts';
import { cloneState, countElement, countVegetal, getLaw } from './state.ts';
import type { Cell, CycleLog, GameState, SeasonSummary } from './types.ts';

export function launchSeason(prev: GameState): GameState {
  if (prev.phase !== 'intervention') throw new Error('Cannot launch: not in intervention phase');
  if (prev.draft !== null) throw new Error('Resolve the draft (take a law or skip) before launching');
  const state = cloneState(prev);
  state.phase = 'running';
  state.miracles = [];
  state.cycleInSeason = 0;
  state.seasonChanges = {};
  state.seasonEssence = 0;
  state.seasonStartEssence = state.essence;
  return state;
}

export function goalReached(grid: readonly Cell[]): boolean {
  return countVegetal(grid) >= GOAL.vegetal && countElement(grid, 'forest') >= GOAL.forests;
}

/** Cheapest miracle able to bring life back (used by the dead-world rule). */
export function cheapestLifeCost(): number {
  return Math.min(...MIRACLES.filter((m) => m.createsLife).map((m) => m.cost));
}

/** Stars earned by winning in a given season (0 if it is beyond every threshold). */
export function starsForSeason(season: number): number {
  return STAR_THRESHOLDS.find((t) => season <= t.maxSeason)?.stars ?? 0;
}

/** Stars of a finished game: 0 unless it was won. */
export function starsFor(state: GameState): number {
  return state.phase === 'won' ? starsForSeason(state.season) : 0;
}

export function isDeadWorld(state: GameState): boolean {
  return (
    countVegetal(state.grid) === 0 &&
    countElement(state.grid, 'seed') === 0 &&
    state.essence < cheapestLifeCost()
  );
}

export function finishSeason(prev: GameState): { state: GameState; summary: SeasonSummary } {
  if (prev.phase !== 'running' || prev.cycleInSeason < CYCLES_PER_SEASON) {
    throw new Error('Season is not finished');
  }
  let state = cloneState(prev);
  const plants = countElement(state.grid, 'plant');
  const forests = countElement(state.grid, 'forest');
  const fromPlants = plants * ESSENCE_PER_PLANT;
  const fromForests = forests * ESSENCE_PER_FOREST;

  const fromLaws: Record<string, number> = {};
  for (const id of state.grimoire) {
    const law = getLaw(id);
    if (law.kind !== 'essence' || law.trigger.type !== 'seasonEnd') continue;
    const t = law.trigger;
    let n = 0;
    for (let i = 0; i < state.grid.length; i++) if (ruleApplies(state.grid, i, t)) n++;
    if (n > 0) fromLaws[id] = n * t.amount;
  }
  const lawTotal = Object.values(fromLaws).reduce((a, b) => a + b, 0);
  state.essence += fromPlants + fromForests + lawTotal;

  const reached = goalReached(state.grid);
  const summary: SeasonSummary = {
    season: state.season,
    essenceBefore: state.seasonStartEssence,
    essenceAfter: state.essence,
    essenceFromCycles: state.seasonEssence,
    essenceFromPlants: fromPlants,
    essenceFromForests: fromForests,
    essenceFromLaws: fromLaws,
    essenceGained: state.seasonEssence + fromPlants + fromForests + lawTotal,
    changesByLaw: { ...state.seasonChanges },
    vegetal: countVegetal(state.grid),
    forests,
    goalReached: reached,
  };
  state.history.push(summary);

  if (reached) {
    state.phase = 'won';
  } else if (isDeadWorld(state)) {
    state.phase = 'lost';
    state.lossReason = 'deadWorld';
  } else if (state.season >= MAX_SEASONS) {
    state.phase = 'lost';
    state.lossReason = 'objective';
  } else {
    state.phase = 'intervention';
    state.season += 1;
    state.cycleInSeason = 0;
    state = drawDraft(state);
  }
  return { state, summary };
}

export interface SeasonResult {
  state: GameState;
  cycles: CycleLog[];
  summary: SeasonSummary;
  /** Grid when the season was launched (to replay the journal on). */
  startGrid: Cell[];
}

/** Launch (if needed) and play the whole season. */
export function runSeason(prev: GameState): SeasonResult {
  let state = prev.phase === 'running' ? prev : launchSeason(prev);
  const startGrid = state.grid.map((c) => ({ ...c }));
  const cycles: CycleLog[] = [];
  while (state.cycleInSeason < CYCLES_PER_SEASON) {
    const r = stepCycle(state);
    state = r.state;
    cycles.push({ cycle: state.cycle, events: r.events, essenceGained: r.essenceGained });
  }
  const fin = finishSeason(state);
  return { state: fin.state, cycles, summary: fin.summary, startGrid };
}
