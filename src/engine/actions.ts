// Player actions during the intervention phase: draft, grimoire edits, miracles, preview.

import { GRIMOIRE_SLOTS } from '../data/constants.ts';
import { MIRACLE_BY_ID } from '../data/miracles.ts';
import { matchesElement } from './conditions.ts';
import { stepCycle } from './cycle.ts';
import { cloneState } from './state.ts';
import type { Cell, ChangeEvent, GameState, MiracleDef } from './types.ts';

function assertIntervention(state: GameState): void {
  if (state.phase !== 'intervention') throw new Error('Only possible during the intervention phase');
}

// ---------- Draft

export function takeDraftLaw(prev: GameState, lawId: string, replaceIndex?: number): GameState {
  assertIntervention(prev);
  if (!prev.draft?.includes(lawId)) throw new Error('Law not offered');
  const state = cloneState(prev);
  if (state.grimoire.length < GRIMOIRE_SLOTS) {
    state.grimoire.push(lawId);
  } else {
    if (replaceIndex === undefined || replaceIndex < 0 || replaceIndex >= state.grimoire.length) {
      throw new Error('Grimoire is full: choose a law to replace');
    }
    state.grimoire[replaceIndex] = lawId;
  }
  state.draft = null;
  return state;
}

export function skipDraft(prev: GameState): GameState {
  assertIntervention(prev);
  return { ...cloneState(prev), draft: null };
}

// ---------- Grimoire

export function moveLaw(prev: GameState, index: number, delta: -1 | 1): GameState {
  assertIntervention(prev);
  const to = index + delta;
  if (index < 0 || index >= prev.grimoire.length || to < 0 || to >= prev.grimoire.length) return prev;
  const state = cloneState(prev);
  [state.grimoire[index], state.grimoire[to]] = [state.grimoire[to]!, state.grimoire[index]!];
  return state;
}

export function removeLaw(prev: GameState, index: number): GameState {
  assertIntervention(prev);
  if (index < 0 || index >= prev.grimoire.length) return prev;
  const state = cloneState(prev);
  state.grimoire.splice(index, 1);
  return state;
}

// ---------- Miracles

export function miracleCanTarget(state: GameState, miracle: MiracleDef, index: number): boolean {
  const cell = state.grid[index];
  if (!cell) return false;
  if (miracle.effect.type === 'raise') return cell.altitude < 2;
  return matchesElement(cell.element, miracle.target);
}

export function canAfford(state: GameState, miracleId: string): boolean {
  const m = MIRACLE_BY_ID[miracleId];
  return !!m && state.essence >= m.cost;
}

/** Indices where the miracle can be cast right now (empty if unaffordable). */
export function miracleTargets(state: GameState, miracleId: string): number[] {
  const m = MIRACLE_BY_ID[miracleId];
  if (!m || state.phase !== 'intervention' || state.essence < m.cost) return [];
  return state.grid.map((_, i) => i).filter((i) => miracleCanTarget(state, m, i));
}

export function castMiracle(prev: GameState, miracleId: string, index: number): GameState {
  assertIntervention(prev);
  const m = MIRACLE_BY_ID[miracleId];
  if (!m) throw new Error(`Unknown miracle: ${miracleId}`);
  if (prev.essence < m.cost) throw new Error('Not enough essence');
  if (!miracleCanTarget(prev, m, index)) throw new Error('Invalid target');
  const state = cloneState(prev);
  const cell = state.grid[index]!;
  state.miracles.push({ miracleId, index, before: { ...cell }, cost: m.cost });
  state.essence -= m.cost;
  if (m.effect.type === 'raise') {
    cell.altitude = (cell.altitude + 1) as 1 | 2;
  } else {
    cell.element = m.effect.element;
    cell.age = 0;
    cell.lastLawId = `miracle.${m.id}`;
  }
  return state;
}

/** Undo the last miracle (LIFO) and refund it. */
export function undoMiracle(prev: GameState): GameState {
  assertIntervention(prev);
  if (prev.miracles.length === 0) return prev;
  const state = cloneState(prev);
  const rec = state.miracles.pop()!;
  state.grid[rec.index] = rec.before;
  state.essence += rec.cost;
  return state;
}

export function undoAllMiracles(prev: GameState): GameState {
  let state = prev;
  while (state.miracles.length > 0) state = undoMiracle(state);
  return state;
}

// ---------- Preview

/** What the next cycle would change (final element per cell), without touching the state. */
export function previewCycle(state: GameState): ChangeEvent[] {
  if (state.phase !== 'intervention') return [];
  const probe: GameState = { ...cloneState(state), phase: 'running' };
  const { events } = stepCycle(probe);
  // Collapse multiple changes of one cell into from-first → to-last.
  const byCell = new Map<number, ChangeEvent>();
  for (const e of events) {
    const prev = byCell.get(e.index);
    byCell.set(e.index, prev ? { ...e, from: prev.from } : e);
  }
  return [...byCell.values()].filter((e) => e.from !== e.to);
}

/** Apply a cycle journal on a grid (used by the UI to replay a season). */
export function applyEvents(grid: readonly Cell[], events: readonly ChangeEvent[]): Cell[] {
  const next = grid.map((c) => ({ ...c, age: c.age + 1 }));
  for (const e of events) next[e.index] = { ...next[e.index]!, element: e.to, age: 0, lastLawId: e.lawId };
  return next;
}
