import { applyEvents } from '../engine/index.ts';
import type { Cell, CycleLog } from '../engine/index.ts';

/** frames[0] = grid at launch, frames[k] = grid after cycle k of the season. */
export function buildFrames(startGrid: Cell[], cycles: CycleLog[]): Cell[][] {
  const frames: Cell[][] = [startGrid];
  for (const c of cycles) frames.push(applyEvents(frames[frames.length - 1]!, c.events));
  return frames;
}
