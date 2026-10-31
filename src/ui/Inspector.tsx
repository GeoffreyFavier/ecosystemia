import { ELEMENTS } from '../data/elements.ts';
import type { Cell } from '../engine/index.ts';
import { toXY } from '../engine/index.ts';
import { lawName } from './names.ts';

interface Props {
  index: number;
  cell: Cell;
  onClose: () => void;
}

export function Inspector({ index, cell, onClose }: Props) {
  const { x, y } = toXY(index);
  const ago = cell.age === 0 ? 'au dernier cycle' : `il y a ${cell.age} cycle${cell.age > 1 ? 's' : ''}`;
  return (
    <div class="sheet" role="dialog" aria-label="Inspecteur">
      <div class="sheet-head">
        <strong>
          {ELEMENTS[cell.element].emoji} {ELEMENTS[cell.element].name}
        </strong>
        <span class="hint">
          case {x + 1},{y + 1}
        </span>
        <button class="icon" onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </div>
      <dl>
        <dt>Altitude</dt>
        <dd>{['basse (0)', 'moyenne (1)', 'haute (2)'][cell.altitude]}</dd>
        <dt>Âge</dt>
        <dd>{cell.age} cycle{cell.age > 1 ? 's' : ''}</dd>
        <dt>Transformée par</dt>
        <dd>{cell.lastLawId ? `${lawName(cell.lastLawId)} (${ago})` : 'jamais'}</dd>
      </dl>
    </div>
  );
}
