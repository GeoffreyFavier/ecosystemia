import { GRID_COLS, GRID_ROWS } from '../src/data/constants.ts';
import { neighborInDir, toIndex, toOffset } from '../src/engine/grid.ts';
import { newGame } from '../src/engine/state.ts';
import type { Altitude, Cell, Dir, ElementId, GameState } from '../src/engine/types.ts';

export const CHARS: Record<string, ElementId> = {
  '.': 'void',
  R: 'rock',
  W: 'water',
  s: 'seed',
  p: 'plant',
  F: 'forest',
  '*': 'fire',
  a: 'ash',
};

interface Opts {
  /** Optional rows of digits 0-2 (same shape as the layout); default altitude is 1. */
  alts?: string[];
  grimoire?: string[];
  cycle?: number;
  essence?: number;
  season?: number;
  phase?: GameState['phase'];
}

/**
 * Build a state from ASCII rows (`GRID_COLS` chars wide, `GRID_ROWS` rows, see CHARS; missing = void).
 * Odd rows are shifted right by half a hex on screen, so for adjacency tests prefer `put` + `nb`.
 */
export function makeState(rows: string[] = [], opts: Opts = {}): GameState {
  const base = newGame(1);
  const grid: Cell[] = [];
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x < GRID_COLS; x++) {
      const ch = rows[y]?.[x] ?? '.';
      const alt = Number(opts.alts?.[y]?.[x] ?? 1) as Altitude;
      grid.push({ element: CHARS[ch]!, altitude: alt, age: 0, lastLawId: null });
    }
  }
  return {
    ...base,
    grid,
    grimoire: opts.grimoire ?? [],
    draft: null,
    phase: opts.phase ?? 'running',
    cycle: opts.cycle ?? 0,
    cycleInSeason: 0,
    essence: opts.essence ?? 10,
    season: opts.season ?? 1,
  };
}

/** Set one cell (mutates and returns the state). */
export function put(s: GameState, col: number, row: number, ch: string, alt?: Altitude): GameState {
  const cell = s.grid[toIndex(col, row)]!;
  cell.element = CHARS[ch]!;
  if (alt !== undefined) cell.altitude = alt;
  return s;
}

/** Coordinates of the neighbor of (col,row) in a direction. */
export function nb(col: number, row: number, dir: Dir): [number, number] {
  const n = neighborInDir(toIndex(col, row), dir);
  if (n < 0) throw new Error('off map');
  const { col: c, row: r } = toOffset(n);
  return [c, r];
}

export const at = (s: GameState, col: number, row: number): Cell => s.grid[toIndex(col, row)]!;
export const el = (s: GameState, col: number, row: number): ElementId => at(s, col, row).element;
