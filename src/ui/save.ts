import { LAW_BY_ID } from '../data/laws.ts';
import { CELL_COUNT } from '../engine/index.ts';
import type { GameState, SeasonResult } from '../engine/index.ts';

// Bump when the map or the state shape changes: old saves are then ignored instead of crashing the engine.
const KEY = 'genese.save.v2';

export interface SaveData {
  game: GameState;
  lastRun: SeasonResult | null;
  /** True while the end-of-season summary has not been acknowledged. */
  pending: boolean;
  debug: boolean;
}

/** Cheap structural check: a save from another map size or with unknown laws must never reach the engine. */
export function isValidSave(data: unknown): data is SaveData {
  const d = data as SaveData | null;
  const g = d?.game;
  if (!g || g.version !== 1 || !Array.isArray(g.grid) || g.grid.length !== CELL_COUNT) return false;
  if (!Array.isArray(g.grimoire) || !g.grimoire.every((id) => id in LAW_BY_ID)) return false;
  if (g.draft !== null && !(Array.isArray(g.draft) && g.draft.every((id) => id in LAW_BY_ID))) return false;
  if (d.lastRun && (!Array.isArray(d.lastRun.startGrid) || d.lastRun.startGrid.length !== CELL_COUNT)) return false;
  return true;
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    return isValidSave(data) ? data : null;
  } catch {
    return null;
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    /* storage full or unavailable: the game still works without saving */
  }
}
