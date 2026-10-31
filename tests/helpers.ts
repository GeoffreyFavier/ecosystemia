import { newGame } from '../src/engine/state.ts';
import type { Altitude, Cell, ElementId, GameState } from '../src/engine/types.ts';
import { toIndex } from '../src/engine/grid.ts';

const CHARS: Record<string, ElementId> = {
  '.': 'void',
  R: 'rock',
  W: 'water',
  s: 'seed',
  p: 'plant',
  F: 'forest',
  '*': 'fire',
  a: 'ash',
};

/**
 * Build a state from an 8-row ASCII layout (see CHARS). Altitude defaults to 1 everywhere;
 * `alts` is an optional 8-row layout of digits 0-2. State is ready to run (phase 'running').
 */
export function makeState(
  rows: string[],
  opts: { alts?: string[]; grimoire?: string[]; cycle?: number; essence?: number; season?: number; phase?: GameState['phase'] } = {},
): GameState {
  const base = newGame(1);
  const grid: Cell[] = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
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

export const at = (s: GameState, x: number, y: number): Cell => s.grid[toIndex(x, y)]!;
export const el = (s: GameState, x: number, y: number): ElementId => at(s, x, y).element;
