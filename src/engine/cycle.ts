// One simulation cycle: A) events, B) simultaneous cell rules, C) ages + journal.

import { NATURAL_CATASTROPHES, NATURAL_WEAR } from '../data/naturalLaws.ts';
import { matchesElement, ruleApplies } from './conditions.ts';
import { getCustomEvent } from './custom.ts';
import { cloneState, getLaw } from './state.ts';
import type { Cell, ChangeEvent, EventLaw, GameState, Law, TransformLaw, ProtectionLaw, ElementId } from './types.ts';

export interface CycleResult {
  state: GameState;
  /** Everything that changed this cycle, in application order. */
  events: ChangeEvent[];
  essenceGained: number;
}

interface Planned {
  to: ElementId;
  lawId: string;
}

/**
 * Decide what happens to one cell, from the snapshot only.
 * Order: protection → natural catastrophes → grimoire transforms (grimoire order) → natural wear.
 */
export function evaluateCell(
  snapshot: readonly Cell[],
  index: number,
  protections: readonly ProtectionLaw[],
  transforms: readonly TransformLaw[],
): Planned | null {
  for (const law of protections) if (ruleApplies(snapshot, index, law.rule)) return null;
  for (const law of NATURAL_CATASTROPHES) {
    if (ruleApplies(snapshot, index, law.rule)) return { to: law.rule.result, lawId: law.id };
  }
  for (const law of transforms) {
    if (ruleApplies(snapshot, index, law.rule)) return { to: law.rule.result, lawId: law.id };
  }
  for (const law of NATURAL_WEAR) {
    if (ruleApplies(snapshot, index, law.rule)) return { to: law.rule.result, lawId: law.id };
  }
  return null;
}

function splitGrimoire(ids: readonly string[]) {
  const laws: Law[] = ids.map(getLaw);
  return {
    protections: laws.filter((l): l is ProtectionLaw => l.kind === 'protection'),
    transforms: laws.filter((l): l is TransformLaw => l.kind === 'transform'),
    events: laws.filter((l): l is EventLaw => l.kind === 'event'),
    essence: laws.filter((l) => l.kind === 'essence'),
  };
}

/** Compute the cell changes of event laws, against the live grid. */
function eventChanges(law: EventLaw, grid: readonly Cell[]): { index: number; to: ElementId }[] {
  const eff = law.effect;
  if (eff.type === 'custom') return getCustomEvent(eff.id)(grid);
  const matches: number[] = [];
  for (let i = 0; i < grid.length; i++) if (ruleApplies(grid, i, eff)) matches.push(i);
  if (eff.type === 'cells') return matches.map((index) => ({ index, to: eff.result }));
  // pickHighest: highest altitude, ties → first in row-major order.
  let best = -1;
  for (const i of matches) if (best < 0 || grid[i]!.altitude > grid[best]!.altitude) best = i;
  return best < 0 ? [] : [{ index: best, to: eff.result }];
}

export function stepCycle(prev: GameState): CycleResult {
  if (prev.phase !== 'running') throw new Error('stepCycle requires a running season');
  const state = cloneState(prev);
  const cycleNo = state.cycle + 1;
  const { protections, transforms, events: eventLaws, essence: essenceLaws } = splitGrimoire(state.grimoire);
  const journal: ChangeEvent[] = [];
  const changed = new Set<number>();

  const apply = (index: number, to: ElementId, lawId: string) => {
    const cell = state.grid[index]!;
    if (cell.element === to) return;
    journal.push({ index, from: cell.element, to, lawId });
    cell.element = to;
    cell.age = 0;
    cell.lastLawId = lawId;
    changed.add(index);
  };

  // A. Events, in grimoire order, applied sequentially on the live grid.
  const eventTouched = new Set<number>();
  for (const law of eventLaws) {
    if (cycleNo % law.period !== 0) continue;
    for (const ch of eventChanges(law, state.grid)) {
      apply(ch.index, ch.to, law.id);
      eventTouched.add(ch.index);
    }
  }

  // B. Cells: simultaneous, from a snapshot taken after events.
  // Cells hit by an event this cycle keep their new state until the next cycle.
  const snapshot = state.grid.map((c) => ({ ...c }));
  const planned: { index: number; plan: Planned }[] = [];
  for (let i = 0; i < snapshot.length; i++) {
    if (eventTouched.has(i)) continue;
    const plan = evaluateCell(snapshot, i, protections, transforms);
    if (plan && plan.to !== snapshot[i]!.element) planned.push({ index: i, plan });
  }
  for (const { index, plan } of planned) apply(index, plan.to, plan.lawId);

  // C. Ages and essence.
  state.grid.forEach((cell, i) => {
    if (!changed.has(i)) cell.age += 1;
  });
  let essenceGained = 0;
  for (const law of essenceLaws) {
    if (law.kind !== 'essence' || law.trigger.type !== 'onChange') continue;
    const t = law.trigger;
    const n = journal.filter((e) => matchesElement(e.from, t.from) && matchesElement(e.to, t.to)).length;
    essenceGained += n * t.amount;
  }
  state.essence += essenceGained;
  state.seasonEssence += essenceGained;
  for (const e of journal) state.seasonChanges[e.lawId] = (state.seasonChanges[e.lawId] ?? 0) + 1;
  state.cycle = cycleNo;
  state.cycleInSeason += 1;

  return { state, events: journal, essenceGained };
}
