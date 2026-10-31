// Hex grid, pointy-top. Stored as "odd-r" offset coordinates (col,row), row-major; neighbor and
// distance maths use axial coordinates (q,r). See https://www.redblobgames.com/grids/hexagons/

import { GRID_COLS, GRID_ROWS } from '../data/constants.ts';
import type { Dir } from './types.ts';

export const CELL_COUNT = GRID_COLS * GRID_ROWS;

export interface Axial {
  q: number;
  r: number;
}

export const toIndex = (col: number, row: number): number => row * GRID_COLS + col;
export const toOffset = (index: number): { col: number; row: number } => ({
  col: index % GRID_COLS,
  row: Math.floor(index / GRID_COLS),
});

/** odd-r offset → axial. */
export const offsetToAxial = (col: number, row: number): Axial => ({ q: col - (row - (row & 1)) / 2, r: row });
/** axial → odd-r offset. */
export const axialToOffset = (q: number, r: number): { col: number; row: number } => ({
  col: q + (r - (r & 1)) / 2,
  row: r,
});

const inBounds = (col: number, row: number): boolean => col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS;

/** Axial deltas (dq, dr) for each direction. */
const AXIAL_DELTAS: Record<Dir, [number, number]> = {
  E: [1, 0],
  O: [-1, 0],
  NE: [1, -1],
  NO: [0, -1],
  SE: [0, 1],
  SO: [-1, 1],
};
export const DIRS = Object.keys(AXIAL_DELTAS) as Dir[];

/** Index of the neighbor in a direction, or -1 if off the map. */
export function neighborInDir(index: number, dir: Dir): number {
  const { col, row } = toOffset(index);
  const a = offsetToAxial(col, row);
  const [dq, dr] = AXIAL_DELTAS[dir];
  const n = axialToOffset(a.q + dq, a.r + dr);
  return inBounds(n.col, n.row) ? toIndex(n.col, n.row) : -1;
}

const NEIGHBORS: number[][] = Array.from({ length: CELL_COUNT }, (_, i) =>
  DIRS.map((d) => neighborInDir(i, d)).filter((n) => n >= 0),
);

/** The (up to 6) neighbors of a cell. */
export function neighborsOf(index: number): readonly number[] {
  return NEIGHBORS[index]!;
}

/** Hex distance between two cells (number of steps). */
export function hexDistance(a: number, b: number): number {
  const pa = toOffset(a);
  const pb = toOffset(b);
  const A = offsetToAxial(pa.col, pa.row);
  const B = offsetToAxial(pb.col, pb.row);
  const dq = A.q - B.q;
  const dr = A.r - B.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

const WITHIN_CACHE = new Map<number, readonly number[]>();

/** Cells at hex distance 1..distance from a cell (the cell itself excluded). */
export function cellsWithin(index: number, distance: number): readonly number[] {
  const key = index * 16 + distance;
  let cells = WITHIN_CACHE.get(key);
  if (!cells) {
    cells = Array.from({ length: CELL_COUNT }, (_, i) => i).filter((i) => i !== index && hexDistance(index, i) <= distance);
    WITHIN_CACHE.set(key, cells);
  }
  return cells;
}
