// Tiny interpreter for the data-driven law conditions.

import { getCustomCondition } from './custom.ts';
import { neighborInDir, neighborsOf } from './grid.ts';
import type { Cell, CellRule, Condition, ElementId, ElementSel } from './types.ts';

export function matchesElement(element: ElementId, sel: ElementSel): boolean {
  if (sel === 'any') return true;
  if (sel === 'vegetal') return element === 'plant' || element === 'forest';
  if (Array.isArray(sel)) return sel.includes(element);
  return element === sel;
}

export function isVegetal(element: ElementId): boolean {
  return element === 'plant' || element === 'forest';
}

function evalCondition(grid: readonly Cell[], index: number, cond: Condition): boolean {
  const cell = grid[index]!;
  switch (cond.type) {
    case 'neighbors': {
      let count = 0;
      for (const n of neighborsOf(index, cond.hood)) {
        const nc = grid[n]!;
        if (!matchesElement(nc.element, cond.element)) continue;
        if (cond.relativeAltitude === 'higher' && !(nc.altitude > cell.altitude)) continue;
        if (cond.relativeAltitude === 'lower' && !(nc.altitude < cell.altitude)) continue;
        if (cond.relativeAltitude === 'same' && nc.altitude !== cell.altitude) continue;
        count++;
      }
      return count >= (cond.min ?? 0) && count <= (cond.max ?? Infinity);
    }
    case 'direction': {
      const n = neighborInDir(index, cond.dir);
      return n >= 0 && matchesElement(grid[n]!.element, cond.element);
    }
    case 'minAge':
      return cell.age >= cond.value;
    case 'altitude':
      return cell.altitude >= (cond.min ?? 0) && cell.altitude <= (cond.max ?? 2);
    case 'custom':
      return getCustomCondition(cond.id)(grid, index);
  }
}

/** True if the cell matches the rule's target element and all its conditions. */
export function ruleApplies(grid: readonly Cell[], index: number, rule: CellRule): boolean {
  if (!matchesElement(grid[index]!.element, rule.target)) return false;
  return rule.conditions.every((c) => evalCondition(grid, index, c));
}
