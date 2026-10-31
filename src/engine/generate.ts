// Seeded world generation.

import { GENERATION } from '../data/constants.ts';
import { CELL_COUNT, neighborsOf } from './grid.ts';
import type { Altitude, Cell } from './types.ts';
import type { Rng } from './rng.ts';

function smoothedNoise(rng: Rng): number[] {
  let noise = Array.from({ length: CELL_COUNT }, () => rng.next());
  const passes = rng.int(GENERATION.smoothingPassesMin, GENERATION.smoothingPassesMax);
  for (let p = 0; p < passes; p++) {
    noise = noise.map((v, i) => {
      const ns = neighborsOf(i, 'moore');
      return (v + ns.reduce((sum, n) => sum + noise[n]!, 0)) / (ns.length + 1);
    });
  }
  return noise;
}

/** Cut the noise in quantiles so all 3 altitude levels are always present. */
function toAltitudes(noise: number[]): Altitude[] {
  const order = noise.map((_, i) => i).sort((a, b) => noise[a]! - noise[b]! || a - b);
  const n0 = Math.round(CELL_COUNT * GENERATION.altitudeShares[0]);
  const n1 = n0 + Math.round(CELL_COUNT * GENERATION.altitudeShares[1]);
  const alt: Altitude[] = new Array(CELL_COUNT).fill(2);
  order.forEach((cellIndex, rank) => {
    alt[cellIndex] = rank < n0 ? 0 : rank < n1 ? 1 : 2;
  });
  return alt;
}

/** Grow a random orthogonally-connected blob of `size` cells; `allowed` restricts candidates. */
function growBlob(rng: Rng, start: number, size: number, allowed: (i: number) => boolean): number[] | null {
  const blob = [start];
  while (blob.length < size) {
    const frontier = new Set<number>();
    for (const b of blob) for (const n of neighborsOf(b, 'ortho')) if (!blob.includes(n) && allowed(n)) frontier.add(n);
    if (frontier.size === 0) return null;
    blob.push(rng.pick([...frontier].sort((a, b) => a - b)));
  }
  return blob;
}

export function generateGrid(rng: Rng): Cell[] {
  const altitude = toAltitudes(smoothedNoise(rng));
  const grid: Cell[] = altitude.map((a) => ({ element: 'void', altitude: a, age: 0, lastLawId: null }));

  // Lake: connected, low altitude.
  const lakeSize = rng.int(GENERATION.lakeMin, GENERATION.lakeMax);
  const lows = rng.shuffle(grid.map((_, i) => i).filter((i) => altitude[i] === 0));
  let lake: number[] | null = null;
  for (const start of lows) {
    lake = growBlob(rng, start, lakeSize, (i) => altitude[i] === 0);
    if (lake) break;
  }
  if (!lake) {
    // Fallback (rare): carve the lake out of any terrain.
    lake = growBlob(rng, rng.int(0, CELL_COUNT - 1), lakeSize, () => true)!;
    for (const i of lake) grid[i]!.altitude = 0;
  }
  for (const i of lake) grid[i]!.element = 'water';

  // Seeds: some next to the water, the others anywhere on bare ground.
  const bare = () => grid.map((_, i) => i).filter((i) => grid[i]!.element === 'void');
  const nearWater = (i: number) => neighborsOf(i, 'moore').some((n) => grid[n]!.element === 'water');
  const wet = rng.shuffle(bare().filter(nearWater)).slice(0, GENERATION.seedsNearWater);
  for (const i of wet) grid[i]!.element = 'seed';
  const others = rng.shuffle(bare()).slice(0, GENERATION.seeds - wet.length);
  for (const i of others) grid[i]!.element = 'seed';

  // Rocks: highest ground first.
  const rockCount = rng.int(GENERATION.rocksMin, GENERATION.rocksMax);
  const ground = bare();
  const byHeight = [2, 1, 0].flatMap((a) => rng.shuffle(ground.filter((i) => grid[i]!.altitude === a)));
  for (const i of byHeight.slice(0, rockCount)) grid[i]!.element = 'rock';

  return grid;
}

