// One-season lookahead planner. Self-contained (engine only), deterministic given the game seed.
//
// At each intervention phase: for every Revelation option (including "pass"), build K candidate miracle
// plans from heuristics, simulate the next season with the real engine, and keep the best by
//   score = vegetal + 2 × forests + essence / 3

import { GRIMOIRE_SLOTS } from '../../data/constants.ts';
import { MIRACLE_BY_ID } from '../../data/miracles.ts';
import { castMiracle, skipDraft, takeDraftLaw } from '../actions.ts';
import { isVegetal } from '../conditions.ts';
import { LAW_PRIORITY } from '../policies.ts';
import type { Policy } from '../policies.ts';
import { createRng } from '../rng.ts';
import type { Rng } from '../rng.ts';
import { runSeason } from '../season.ts';
import type { GameState } from '../types.ts';
import { candidateMoves } from './moves.ts';

export interface PlannerOptions {
  /** Candidate plans per Revelation option. */
  candidates?: number;
  /** Safety cap on casts per plan. */
  maxCasts?: number;
}

export const DEFAULT_PLANNER_CANDIDATES = 20;

/** Heuristic score from which a seed counts as "next to Water" (see moves.ts). */
const SOW_NEXT_TO_WATER = 3;

/** Evaluate a state reached after the simulated season. */
export function scoreState(state: GameState): number {
  if (state.phase === 'won') return 1e6;
  if (state.phase === 'lost') return -1e6;
  const vegetal = state.grid.filter((c) => isVegetal(c.element)).length;
  const forests = state.grid.filter((c) => c.element === 'forest').length;
  return vegetal + 2 * forests + state.essence / 3;
}

interface Option {
  state: GameState;
}

/** Revelation choices: pass, or take each offered law (replacing the lowest-priority one when full). */
function revelationOptions(state: GameState): Option[] {
  if (!state.draft) return [{ state }];
  const options: Option[] = [{ state: skipDraft(state) }];
  for (const lawId of state.draft) {
    if (state.grimoire.length < GRIMOIRE_SLOTS) {
      options.push({ state: takeDraftLaw(state, lawId) });
    } else {
      // Replace the slot whose law has the worst priority (laws outside the list are kept).
      let worst = -1;
      let worstRank = -1;
      state.grimoire.forEach((id, i) => {
        const rank = LAW_PRIORITY.indexOf(id);
        if (rank > worstRank) {
          worstRank = rank;
          worst = i;
        }
      });
      if (worst >= 0) options.push({ state: takeDraftLaw(state, lawId, worst) });
    }
  }
  return options;
}

/** Deterministic per-(game, season, option, candidate) RNG that never touches the game's own RNG. */
function planRng(state: GameState, option: number, k: number): Rng {
  const mix =
    state.seed ^ Math.imul(state.season, 0x9e3779b1) ^ Math.imul(option + 1, 0x85ebca6b) ^ Math.imul(k + 1, 0xc2b2ae35);
  return createRng(mix | 0);
}

/** Build one candidate plan (a state with miracles already cast). Candidate 0 casts nothing. */
function buildPlan(start: GameState, rng: Rng, k: number, maxCasts: number): GameState {
  if (k === 0) return start;
  const allowed = new Set<string>(['sow']);
  let cap = 1;
  let temperature = 0; // 0 = always the best-scored move
  // k = 1: sow only. k = 2: sow first, a spring only once no seed can go next to Water.
  const sowFirst = k === 2;
  if (k > 2) {
    if (rng.next() < 0.6) allowed.add('spring');
    if (rng.next() < 0.3) allowed.add('raise');
    if (rng.next() < 0.3) allowed.add('ignite');
    cap = 0.3 + 0.7 * rng.next();
    temperature = 0.4 + 1.6 * rng.next();
  } else if (k === 2) {
    allowed.add('spring');
  }
  const budget = Math.floor(start.essence * cap);
  const floor = start.essence - budget;

  let state = start;
  for (let n = 0; n < maxCasts; n++) {
    let moves = candidateMoves(state, allowed).filter(
      (m) => state.essence - MIRACLE_BY_ID[m.miracleId]!.cost >= floor,
    );
    if (sowFirst && moves.some((m) => m.miracleId === 'sow' && m.score >= SOW_NEXT_TO_WATER)) {
      moves = moves.filter((m) => m.miracleId === 'sow');
    }
    if (moves.length === 0) break;
    let pick = moves[0]!;
    if (temperature === 0) {
      for (const m of moves) if (m.score > pick.score) pick = m;
    } else {
      const best = Math.max(...moves.map((m) => m.score));
      const weights = moves.map((m) => Math.exp((m.score - best) / temperature));
      let roll = rng.next() * weights.reduce((a, b) => a + b, 0);
      pick = moves[moves.length - 1]!;
      for (let i = 0; i < moves.length; i++) {
        roll -= weights[i]!;
        if (roll < 0) {
          pick = moves[i]!;
          break;
        }
      }
    }
    state = castMiracle(state, pick.miracleId, pick.index);
  }
  return state;
}

/** Create the planner policy. */
export function createPlannerPolicy(options: PlannerOptions = {}): Policy {
  const K = options.candidates ?? DEFAULT_PLANNER_CANDIDATES;
  const maxCasts = options.maxCasts ?? 24;
  return (state) => {
    let best: GameState | null = null;
    let bestScore = -Infinity;
    revelationOptions(state).forEach((opt, o) => {
      for (let k = 0; k < K; k++) {
        const plan = buildPlan(opt.state, planRng(state, o, k), k, maxCasts);
        const score = scoreState(runSeason(plan).state);
        if (score > bestScore) {
          bestScore = score;
          best = plan;
        }
      }
    });
    return best!;
  };
}

export const plannerPolicy: Policy = createPlannerPolicy();
