// Balance simulator: plays full games without UI.
// Usage:
//   npm run sim -- --runs 500 [--policy naive|greedy|planner] [--planner-k 20] [--seed 1] [--sweep [--variants A,B,C]]
// --sweep compares the balance variants of src/data/variants.ts with both policies.

import { isMainThread, parentPort, Worker, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';
import { GOAL, START } from '../src/data/constants.ts';
import { LAW_BY_ID } from '../src/data/laws.ts';
import { NATURAL_EVENTS } from '../src/data/naturalLaws.ts';
import { MIRACLES } from '../src/data/miracles.ts';
import { VARIANTS } from '../src/data/variants.ts';
import type { BalanceVariant } from '../src/data/variants.ts';
import type { Law } from '../src/engine/types.ts';
import { createPlannerPolicy } from '../src/engine/ai/planner.ts';
import { greedyPolicy, naivePolicy } from '../src/engine/policies.ts';
import type { Policy } from '../src/engine/policies.ts';
import { playGameDetailed } from '../src/engine/telemetry.ts';
import type { GameReport } from '../src/engine/telemetry.ts';

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1]!.startsWith('--') ? process.argv[i + 1]! : fallback;
}
const flag = (name: string) => process.argv.includes(`--${name}`);

const plannerK = Number(arg('planner-k', '20'));
const policies: Record<string, Policy> = { naive: naivePolicy, greedy: greedyPolicy, planner: createPlannerPolicy({ candidates: plannerK }) };
const runs = Number(arg('runs', '500'));
const firstSeed = Number(arg('seed', '1'));

let lastMsPerGame = 0;
function playAll(policy: Policy, n = runs): GameReport[] {
  const t = performance.now();
  const games = Array.from({ length: n }, (_, i) => playGameDetailed(firstSeed + i, policy));
  lastMsPerGame = (performance.now() - t) / n;
  return games;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pct = (n: number, d = runs) => `${((100 * n) / d).toFixed(1)} %`;
const f1 = (n: number) => n.toFixed(1);

// ---------------------------------------------------------------- single policy report

function report(name: string, games: GameReport[]): void {
  const wins = games.filter((g) => g.won);
  const lost = games.filter((g) => !g.won);
  const bySeason: Record<number, number> = {};
  for (const g of wins) bySeason[g.endSeason] = (bySeason[g.endSeason] ?? 0) + 1;
  const reasons: Record<string, number> = {};
  for (const g of lost) reasons[g.lossReason ?? '?'] = (reasons[g.lossReason ?? '?'] ?? 0) + 1;

  console.log(`Policy: ${name} — ${runs} games (seeds ${firstSeed}…${firstSeed + runs - 1})`);
  console.log(`Goal: ≥ ${GOAL.vegetal} vegetal, ≥ ${GOAL.forests} forests · start essence ${START.essence}`);
  console.log(`Win rate:            ${pct(wins.length)} (${wins.length}/${runs})`);
  console.log(`Avg win season:      ${wins.length ? f1(mean(wins.map((g) => g.endSeason))) : '—'}`);
  console.log(`Wins by season:      ${JSON.stringify(bySeason)}`);
  console.log(`Losses:              ${JSON.stringify(reasons)}`);
  console.log(`Avg final essence:   ${f1(mean(games.map((g) => g.finalEssence)))}`);
  console.log(`Avg final vegetal:   ${f1(mean(games.map((g) => g.finalVegetal)))} (forests ${f1(mean(games.map((g) => g.finalForests)))})`);

  console.log('\nDiagnostic (average per game)');
  console.log(`  Plants created:                 ${f1(mean(games.map((g) => g.plantsCreated)))}`);
  console.log(`    → became a Forest:            ${f1(mean(games.map((g) => g.plantsGrown)))}`);
  console.log(`    → never became a Forest:      ${f1(mean(games.map((g) => g.plantsNeverForest)))}` +
    `  (burned ${f1(mean(games.map((g) => g.plantsBurned)))}, still Plant at the end ${f1(mean(games.map((g) => g.plantsStagnant)))})`);
  console.log(`  Vegetal lost to fire:           ${f1(mean(games.map((g) => g.vegetalBurned)))} (of which Forests ${f1(mean(games.map((g) => g.forestsBurned)))})`);
  console.log(`  Seeds withered:                 ${f1(mean(games.map((g) => g.seedsWithered)))}`);
  console.log('  Essence spent per miracle:');
  for (const m of MIRACLES) {
    const spent = mean(games.map((g) => g.essenceSpent[m.id] ?? 0));
    const casts = mean(games.map((g) => g.miraclesCast[m.id] ?? 0));
    console.log(`    ${m.name.padEnd(9)} ${f1(spent).padStart(6)} essence (${f1(casts)} casts)`);
  }

  console.log(`\nLaws in the final grimoire — won games (${wins.length}) vs lost games (${lost.length})`);
  console.log('  law                won      lost     diff');
  const rows = Object.keys(LAW_BY_ID).map((id) => {
    const w = wins.length ? (100 * wins.filter((g) => g.grimoire.includes(id)).length) / wins.length : 0;
    const l = lost.length ? (100 * lost.filter((g) => g.grimoire.includes(id)).length) / lost.length : 0;
    return { id, w, l, d: w - l };
  });
  rows.sort((a, b) => b.d - a.d);
  for (const r of rows) {
    console.log(`  ${LAW_BY_ID[r.id]!.name.padEnd(17)} ${(f1(r.w) + ' %').padStart(7)}  ${(f1(r.l) + ' %').padStart(7)}  ${(r.d >= 0 ? '+' : '') + f1(r.d)}`);
  }
}

if (isMainThread && !flag('sweep')) {
  const policyName = arg('policy', 'naive');
  const policy = policies[policyName];
  if (!policy) throw new Error(`Unknown policy "${policyName}" (naive | greedy | planner)`);
  const games = playAll(policy);
  report(policyName, games);
  console.log(`\nCompute time: ${lastMsPerGame.toFixed(1)} ms per game`);
}

// ---------------------------------------------------------------- sweep

/** Run `fn` with a variant's overrides applied to the (mutable) data, then restore the defaults. */
function withVariant<T>(v: BalanceVariant, fn: () => T): T {
  const croissance = LAW_BY_ID['croissance'] as Extract<Law, { kind: 'transform' }>;
  const saved = { vegetal: GOAL.vegetal, forests: GOAL.forests, essence: START.essence, conditions: croissance.rule.conditions, orage: NATURAL_EVENTS.map((e) => e.enabled) };
  try {
    if (v.goalVegetal !== undefined) GOAL.vegetal = v.goalVegetal;
    if (v.goalForests !== undefined) GOAL.forests = v.goalForests;
    if (v.startEssence !== undefined) START.essence = v.startEssence;
    if (v.croissance) croissance.rule.conditions = v.croissance;
    if (v.orage !== undefined) for (const e of NATURAL_EVENTS) if (e.id === 'orage') e.enabled = v.orage;
    return fn();
  } finally {
    GOAL.vegetal = saved.vegetal;
    GOAL.forests = saved.forests;
    START.essence = saved.essence;
    croissance.rule.conditions = saved.conditions;
    NATURAL_EVENTS.forEach((e, i) => (e.enabled = saved.orage[i]!));
  }
}

interface Job {
  variantId: string;
  policy: string;
  runs: number;
  firstSeed: number;
  plannerK: number;
}
interface JobResult {
  job: Job;
  games: GameReport[];
  msPerGame: number;
}

/** Worker side: play one (variant, policy) batch. */
function runJob(job: Job): JobResult {
  const variant = VARIANTS.find((v) => v.id === job.variantId)!;
  const policy: Policy =
    job.policy === 'planner' ? createPlannerPolicy({ candidates: job.plannerK }) : policies[job.policy]!;
  return withVariant(variant, () => {
    const t = performance.now();
    const games = Array.from({ length: job.runs }, (_, i) => playGameDetailed(job.firstSeed + i, policy));
    return { job, games, msPerGame: (performance.now() - t) / job.runs };
  });
}

if (!isMainThread) {
  parentPort!.postMessage(runJob(workerData as Job));
}

function runInWorker(job: Job): Promise<JobResult> {
  return new Promise((resolve, reject) => {
    const w = new Worker(new URL(import.meta.url), { workerData: job });
    w.once('message', resolve);
    w.once('error', reject);
  });
}

/** Run jobs on a pool of workers (one per CPU core), longest jobs first. */
async function runPool(jobs: Job[]): Promise<JobResult[]> {
  const queue = [...jobs].sort((a, b) => Number(b.policy === 'planner') - Number(a.policy === 'planner'));
  const results: JobResult[] = [];
  const workers = Math.max(1, cpus().length);
  await Promise.all(
    Array.from({ length: workers }, async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        results.push(await runInWorker(job));
        process.stderr.write(`  done ${job.variantId} / ${job.policy}\n`);
      }
    }),
  );
  return results;
}

interface Summary {
  win: number;
  s3: number;
  s4: number;
  s5: number;
  /** Share of wins obtained in season ≤ 4. */
  upTo4: number;
  burned: number;
  forestsBurned: number;
  finalForests: number;
  neverForest: number;
  casts: Record<string, number>;
  ms: number;
}

function summarize(r: JobResult): Summary {
  const games = r.games;
  const wins = games.filter((g) => g.won);
  const share = (pred: (g: GameReport) => boolean) => (wins.length ? (100 * wins.filter(pred).length) / wins.length : 0);
  const casts: Record<string, number> = {};
  for (const m of MIRACLES) casts[m.id] = mean(games.map((g) => g.miraclesCast[m.id] ?? 0));
  return {
    win: (100 * wins.length) / games.length,
    s3: share((g) => g.endSeason <= 3),
    s4: share((g) => g.endSeason === 4),
    s5: share((g) => g.endSeason === 5),
    upTo4: share((g) => g.endSeason <= 4),
    burned: mean(games.map((g) => g.vegetalBurned)),
    forestsBurned: mean(games.map((g) => g.forestsBurned)),
    finalForests: mean(games.map((g) => g.finalForests)),
    neverForest: mean(games.map((g) => g.plantsNeverForest)),
    casts,
    ms: r.msPerGame,
  };
}

async function sweep(): Promise<void> {
  const plannerRuns = Number(arg('planner-runs', String(runs)));
  const wanted = arg('variants', '').split(',').filter(Boolean);
  const chosen = wanted.length ? VARIANTS.filter((v) => wanted.includes(v.id)) : VARIANTS;
  const plannerK = Number(arg('planner-k', '20'));
  const jobs: Job[] = chosen.flatMap((v) =>
    (['naive', 'greedy', 'planner'] as const).map((policy) => ({
      variantId: v.id,
      policy,
      runs: policy === 'planner' ? plannerRuns : runs,
      firstSeed,
      plannerK,
    })),
  );
  const t0 = performance.now();
  const results = await runPool(jobs);
  const get = (v: string, p: string) => summarize(results.find((r) => r.job.variantId === v && r.job.policy === p)!);

  console.log(`Sweep — ${runs} games per variant (planner: ${plannerRuns}, K=${plannerK}), seeds ${firstSeed}…, ${((performance.now() - t0) / 1000).toFixed(0)} s on ${cpus().length} cores`);
  console.log('Targets: greedy 35–50 %, planner 85–95 % with ≥ 30 % of its wins in season ≤ 4. naive is informative only.\n');
  const seasons = (c: Summary) => `${c.s3.toFixed(0)}/${c.s4.toFixed(0)}/${c.s5.toFixed(0)}`;
  console.log('| Var | Description | naive | greedy | greedy S≤3/4/5 | greedy burned | planner | planner S≤3/4/5 | planner wins ≤S4 | planner burned (forests) | planner ms/game |');
  console.log('|-----|-------------|-------|--------|----------------|---------------|---------|-----------------|------------------|--------------------------|-----------------|');
  for (const v of chosen) {
    const n = get(v.id, 'naive');
    const g = get(v.id, 'greedy');
    const p = get(v.id, 'planner');
    console.log(
      `| ${v.id} | ${v.label} | ${n.win.toFixed(1)} % | ${g.win.toFixed(1)} % | ${seasons(g)} | ${f1(g.burned)} | ${p.win.toFixed(1)} % | ${seasons(p)} | ${p.upTo4.toFixed(0)} % | ${f1(p.burned)} (${f1(p.forestsBurned)}) | ${p.ms.toFixed(0)} |`,
    );
  }
  console.log('\nMiracle usage (casts per game)');
  console.log('| Var | greedy Semer | greedy Source | greedy Soulever | greedy Embraser | planner Semer | planner Source | planner Soulever | planner Embraser |');
  console.log('|-----|-----|-----|-----|-----|-----|-----|-----|-----|');
  for (const v of chosen) {
    const g = get(v.id, 'greedy').casts;
    const p = get(v.id, 'planner').casts;
    console.log(`| ${v.id} | ${MIRACLES.map((m) => f1(g[m.id]!)).join(' | ')} | ${MIRACLES.map((m) => f1(p[m.id]!)).join(' | ')} |`);
  }
}

if (isMainThread && flag('sweep')) await sweep();
