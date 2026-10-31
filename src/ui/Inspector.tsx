import { GRID_COLS } from '../data/constants.ts';
import { ELEMENTS } from '../data/elements.ts';
import type { Cell } from '../engine/index.ts';
import { toOffset } from '../engine/index.ts';
import { hexCenter, VIEW_H, VIEW_W } from './hex.ts';
import { lawName } from './names.ts';

interface Props {
  index: number;
  cell: Cell;
  onClose: () => void;
}

/** Bubble anchored next to the tapped hex (positioned in % of the map, so it follows any scaling). */
export function Inspector({ index, cell, onClose }: Props) {
  const { col, row } = toOffset(index);
  const { x, y } = hexCenter(col, row);
  const below = row < 3;
  const align = col < 2 ? 'left' : col > GRID_COLS - 3 ? 'right' : 'center';
  const ago = cell.age === 0 ? 'au dernier cycle' : `il y a ${cell.age} cycle${cell.age > 1 ? 's' : ''}`;
  return (
    <div
      class={`bubble ${below ? 'below' : 'above'} align-${align}`}
      style={{ left: `${(100 * x) / VIEW_W}%`, top: `${(100 * y) / VIEW_H}%` }}
      role="dialog"
      aria-label="Inspecteur"
    >
      <div class="bubble-head">
        <strong>
          {ELEMENTS[cell.element].emoji} {ELEMENTS[cell.element].name}
        </strong>
        <button class="bubble-close" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </div>
      <dl>
        <dt>Altitude</dt>
        <dd>{['basse (0)', 'moyenne (1)', 'haute (2)'][cell.altitude]}</dd>
        <dt>Âge</dt>
        <dd>
          {cell.age} cycle{cell.age > 1 ? 's' : ''}
        </dd>
        <dt>Transformée par</dt>
        <dd>{cell.lastLawId ? `${lawName(cell.lastLawId)} (${ago})` : 'jamais'}</dd>
      </dl>
    </div>
  );
}
