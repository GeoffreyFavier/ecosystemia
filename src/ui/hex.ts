// Hex geometry for rendering (pointy-top, odd-r offset: odd rows are shifted right by half a hex).
import { GRID_COLS, GRID_ROWS } from '../data/constants.ts';

export const HEX_SIZE = 20; // center → corner, in SVG user units
const SQ3 = Math.sqrt(3);

export const HEX_W = SQ3 * HEX_SIZE;
export const VIEW_W = HEX_W * (GRID_COLS + 0.5);
export const VIEW_H = HEX_SIZE * (1.5 * (GRID_ROWS - 1) + 2);

export function hexCenter(col: number, row: number): { x: number; y: number } {
  return { x: HEX_W * (col + 0.5 * (row & 1) + 0.5), y: HEX_SIZE * (1.5 * row + 1) };
}

/** Polygon points of a pointy-top hex; `scale` < 1 leaves a small gap between cells. */
export function hexPoints(cx: number, cy: number, scale = 1): string {
  const pts: string[] = [];
  for (let k = 0; k < 6; k++) {
    const a = (Math.PI / 180) * (60 * k - 30);
    pts.push(`${(cx + HEX_SIZE * scale * Math.cos(a)).toFixed(2)},${(cy + HEX_SIZE * scale * Math.sin(a)).toFixed(2)}`);
  }
  return pts.join(' ');
}
