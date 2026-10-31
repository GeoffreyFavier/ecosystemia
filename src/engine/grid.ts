import { GRID_SIZE } from '../data/constants.ts';
import type { Dir, Hood } from './types.ts';

export const CELL_COUNT = GRID_SIZE * GRID_SIZE;

export const toIndex = (x: number, y: number): number => y * GRID_SIZE + x;
export const toXY = (index: number): { x: number; y: number } => ({
  x: index % GRID_SIZE,
  y: Math.floor(index / GRID_SIZE),
});

const DIR_DELTAS: Record<Dir, [number, number]> = {
  N: [0, -1],
  S: [0, 1],
  E: [1, 0],
  W: [-1, 0],
  NE: [1, -1],
  NW: [-1, -1],
  SE: [1, 1],
  SW: [-1, 1],
};

const ORTHO: Dir[] = ['N', 'E', 'S', 'W'];
const MOORE: Dir[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/** Index of the neighbor in a direction, or -1 if off-grid. */
export function neighborInDir(index: number, dir: Dir): number {
  const { x, y } = toXY(index);
  const [dx, dy] = DIR_DELTAS[dir];
  const nx = x + dx;
  const ny = y + dy;
  if (nx < 0 || ny < 0 || nx >= GRID_SIZE || ny >= GRID_SIZE) return -1;
  return toIndex(nx, ny);
}

function buildTable(dirs: Dir[]): number[][] {
  return Array.from({ length: CELL_COUNT }, (_, i) =>
    dirs.map((d) => neighborInDir(i, d)).filter((n) => n >= 0),
  );
}

const TABLES: Record<Hood, number[][]> = { ortho: buildTable(ORTHO), moore: buildTable(MOORE) };

export function neighborsOf(index: number, hood: Hood): readonly number[] {
  return TABLES[hood][index]!;
}
