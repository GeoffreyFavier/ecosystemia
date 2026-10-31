// Escape hatch for exotic laws that cannot be expressed as data.
// Age I uses none of it (100 % data); the registries exist for later Ages.

import type { Cell } from './types.ts';

export type CustomCondition = (grid: readonly Cell[], index: number) => boolean;
/** Returns the cells to change and their new element. */
export type CustomEvent = (grid: readonly Cell[]) => { index: number; to: Cell['element'] }[];

const conditions = new Map<string, CustomCondition>();
const events = new Map<string, CustomEvent>();

export function registerCustomCondition(id: string, fn: CustomCondition): void {
  conditions.set(id, fn);
}
export function registerCustomEvent(id: string, fn: CustomEvent): void {
  events.set(id, fn);
}
export function getCustomCondition(id: string): CustomCondition {
  const fn = conditions.get(id);
  if (!fn) throw new Error(`Unknown custom condition: ${id}`);
  return fn;
}
export function getCustomEvent(id: string): CustomEvent {
  const fn = events.get(id);
  if (!fn) throw new Error(`Unknown custom event: ${id}`);
  return fn;
}
