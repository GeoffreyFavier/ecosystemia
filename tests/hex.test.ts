import { describe, expect, it } from 'vitest';
import { GRID_COLS, GRID_ROWS } from '../src/data/constants.ts';
import {
  axialToOffset,
  CELL_COUNT,
  cellsWithin,
  DIRS,
  hexDistance,
  neighborInDir,
  neighborsOf,
  offsetToAxial,
  toIndex,
} from '../src/engine/grid.ts';

describe('hex grid (odd-r offset, axial maths)', () => {
  it('has the configured size', () => {
    expect(GRID_COLS).toBe(12);
    expect(GRID_ROWS).toBe(9);
    expect(CELL_COUNT).toBe(108);
  });

  it('offset ↔ axial round-trips for every cell', () => {
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const a = offsetToAxial(col, row);
        expect(axialToOffset(a.q, a.r)).toEqual({ col, row });
      }
    }
  });

  it('interior cells have exactly 6 distinct neighbors, all at distance 1', () => {
    for (const [col, row] of [[5, 4], [5, 3], [1, 4], [10, 5]] as const) {
      const i = toIndex(col, row);
      const ns = neighborsOf(i);
      expect(ns).toHaveLength(6);
      expect(new Set(ns).size).toBe(6);
      for (const n of ns) expect(hexDistance(i, n)).toBe(1);
    }
  });

  it('odd rows are shifted right (odd-r): the NE neighbor of an odd row is in col+1', () => {
    // Even row 4, col 5 → NE is (5,3); odd row 3, col 5 → NE is (6,2).
    expect(neighborInDir(toIndex(5, 4), 'NE')).toBe(toIndex(5, 3));
    expect(neighborInDir(toIndex(5, 3), 'NE')).toBe(toIndex(6, 2));
    expect(neighborInDir(toIndex(5, 3), 'NO')).toBe(toIndex(5, 2));
    expect(neighborInDir(toIndex(5, 4), 'NO')).toBe(toIndex(4, 3));
    expect(neighborInDir(toIndex(5, 4), 'E')).toBe(toIndex(6, 4));
    expect(neighborInDir(toIndex(5, 4), 'O')).toBe(toIndex(4, 4));
  });

  it('neighborhood is symmetric and opposite directions cancel out', () => {
    const opposite = { E: 'O', O: 'E', NE: 'SO', SO: 'NE', NO: 'SE', SE: 'NO' } as const;
    for (let i = 0; i < CELL_COUNT; i++) {
      for (const n of neighborsOf(i)) expect(neighborsOf(n)).toContain(i);
      for (const d of DIRS) {
        const n = neighborInDir(i, d);
        if (n >= 0) expect(neighborInDir(n, opposite[d])).toBe(i);
      }
    }
  });

  it('edges and corners have fewer neighbors, never off-map ones', () => {
    expect(neighborsOf(toIndex(0, 0))).toHaveLength(2);
    expect(neighborsOf(toIndex(11, 0))).toHaveLength(3);
    expect(neighborsOf(toIndex(0, 4)).length).toBeLessThan(6);
    for (let i = 0; i < CELL_COUNT; i++) for (const n of neighborsOf(i)) expect(n).toBeGreaterThanOrEqual(0);
    expect(neighborInDir(toIndex(0, 0), 'O')).toBe(-1);
  });

  it('hexDistance matches a breadth-first search', () => {
    const start = toIndex(2, 3);
    const dist = new Map([[start, 0]]);
    const queue = [start];
    while (queue.length) {
      const c = queue.shift()!;
      for (const n of neighborsOf(c)) {
        if (!dist.has(n)) {
          dist.set(n, dist.get(c)! + 1);
          queue.push(n);
        }
      }
    }
    for (let i = 0; i < CELL_COUNT; i++) expect(hexDistance(start, i)).toBe(dist.get(i));
  });
});

describe('cellsWithin', () => {
  it('matches hexDistance and excludes the cell itself', () => {
    const c = toIndex(5, 4);
    const d2 = cellsWithin(c, 2);
    expect(d2).toHaveLength(18); // 6 + 12 in an unclipped hex disc
    expect(d2).not.toContain(c);
    for (const i of d2) expect(hexDistance(c, i)).toBeLessThanOrEqual(2);
    expect(new Set(cellsWithin(c, 1))).toEqual(new Set(neighborsOf(c)));
  });
});
