import type { GameState, SeasonResult } from '../engine/index.ts';

const KEY = 'genese.save.v1';

export interface SaveData {
  game: GameState;
  lastRun: SeasonResult | null;
  /** True while the end-of-season summary has not been acknowledged. */
  pending: boolean;
  debug: boolean;
}

export function loadSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as SaveData;
    if (data?.game?.version !== 1 || !Array.isArray(data.game.grid) || data.game.grid.length !== 64) return null;
    return data;
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
