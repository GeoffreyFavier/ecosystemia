import { ELEMENTS } from '../data/elements.ts';
import { toOffset } from '../engine/index.ts';
import type { Cell, ElementId } from '../engine/index.ts';
import { hexCenter, hexPoints, HEX_SIZE, VIEW_H, VIEW_W } from './hex.ts';
import { glyph } from './names.ts';

interface Props {
  cells: Cell[];
  /** Cells that are valid targets for the selected miracle. */
  targets: Set<number>;
  /** Cells that changed in the frame being displayed (blink). */
  flashes: Set<number>;
  flashKey: number;
  /** Preview: cell → element it would become. */
  preview: Map<number, ElementId>;
  selected: number | null;
  onTap: (index: number) => void;
}

export function Board({ cells, targets, flashes, flashKey, preview, selected, onTap }: Props) {
  return (
    <svg class="board" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="grid" aria-label="Le monde" preserveAspectRatio="xMidYMid meet">
      {cells.map((c, i) => {
        const { col, row } = toOffset(i);
        const { x, y } = hexCenter(col, row);
        const pv = preview.get(i);
        const base = [
          'hex',
          `alt-${c.altitude}`,
          targets.has(i) ? 'target' : '',
          pv ? 'preview' : '',
          selected === i ? 'selected' : '',
        ].join(' ');
        return (
          <g key={i} class="hex-cell" role="gridcell" aria-label={`${ELEMENTS[c.element].name}, altitude ${c.altitude}`}>
            <polygon class={base} points={hexPoints(x, y, 0.95)} onClick={() => onTap(i)} />
            <polygon class={`hex-tint el-${c.element}`} points={hexPoints(x, y, 0.95)} />
            {flashes.has(i) && <polygon class={`hex-flash flash-${flashKey % 2}`} points={hexPoints(x, y, 0.95)} />}
            <text class="emoji" x={x} y={y + 1} text-anchor="middle" dominant-baseline="central" font-size={HEX_SIZE * 1.05}>
              {ELEMENTS[c.element].emoji}
            </text>
            <text class="alt-mark" x={x} y={y + HEX_SIZE * 0.78} text-anchor="middle" font-size={HEX_SIZE * 0.5}>
              {'·'.repeat(c.altitude + 1)}
            </text>
            {pv && (
              <text class="badge" x={x + HEX_SIZE * 0.45} y={y - HEX_SIZE * 0.4} text-anchor="middle" font-size={HEX_SIZE * 0.6}>
                {glyph(pv)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
