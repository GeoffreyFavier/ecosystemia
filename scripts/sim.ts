// Balance simulator: plays full games without UI.
// Usage: npm run sim -- --runs 500 [--policy naive|greedy] [--seed 1]

import { GOAL } from '../src/data/constants.ts';
import { greedyPolicy, naivePolicy, playGame } from '../src/engine/policies.ts';
import type { Policy } from '../src/engine/policies.ts';
import { countElement, countVegetal } from '../src/engine/state.ts';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1]! : fallback;
}

const runs = Number(arg('runs', '500'));
const firstSeed = Number(arg('seed', '1'));
const policyName = arg('policy', 'naive');
const policies: Record<string, Policy> = { naive: naivePolicy, greedy: greedyPolicy };
const policy = policies[policyName];
if (!policy) throw new Error(`Unknown policy "${policyName}" (naive | greedy)`);

let wins = 0;
let winSeasonSum = 0;
let essenceSum = 0;
let vegSum = 0;
let forestSum = 0;
const lossReasons: Record<string, number> = {};
const winSeasons: Record<number, number> = {};

for (let i = 0; i < runs; i++) {
  const end = playGame(firstSeed + i, policy);
  essenceSum += end.essence;
  vegSum += countVegetal(end.grid);
  forestSum += countElement(end.grid, 'forest');
  if (end.phase === 'won') {
    wins++;
    winSeasonSum += end.season;
    winSeasons[end.season] = (winSeasons[end.season] ?? 0) + 1;
  } else {
    const r = end.lossReason ?? 'unknown';
    lossReasons[r] = (lossReasons[r] ?? 0) + 1;
  }
}

const pct = (n: number) => `${((100 * n) / runs).toFixed(1)} %`;
console.log(`Policy: ${policyName} — ${runs} games (seeds ${firstSeed}…${firstSeed + runs - 1})`);
console.log(`Goal: ≥ ${GOAL.vegetal} vegetal, ≥ ${GOAL.forests} forests`);
console.log(`Win rate:            ${pct(wins)} (${wins}/${runs})`);
console.log(`Avg win season:      ${wins ? (winSeasonSum / wins).toFixed(2) : '—'}`);
console.log(`Wins by season:      ${JSON.stringify(winSeasons)}`);
console.log(`Losses:              ${JSON.stringify(lossReasons)}`);
console.log(`Avg final essence:   ${(essenceSum / runs).toFixed(1)}`);
console.log(`Avg final vegetal:   ${(vegSum / runs).toFixed(1)} (forests ${(forestSum / runs).toFixed(1)})`);
