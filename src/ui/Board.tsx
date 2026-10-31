import { ELEMENTS } from '../data/elements.ts';
import { glyph } from './names.ts';
import type { Cell, ElementId } from '../engine/index.ts';

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
    <div class="board" role="grid" aria-label="Le monde">
      {cells.map((c, i) => {
        const pv = preview.get(i);
        const cls = [
          'cell',
          `alt-${c.altitude}`,
          `el-${c.element}`,
          targets.has(i) ? 'target' : '',
          flashes.has(i) ? `flash flash-${flashKey % 2}` : '',
          pv ? 'preview' : '',
          selected === i ? 'selected' : '',
        ].join(' ');
        return (
          <button
            key={i}
            class={cls}
            onClick={() => onTap(i)}
            aria-label={`${ELEMENTS[c.element].name}, altitude ${c.altitude}`}
          >
            <span class="emoji">{ELEMENTS[c.element].emoji}</span>
            <span class="alt-mark" aria-hidden="true">{'·'.repeat(c.altitude + 1)}</span>
            {pv && <span class={`badge el-${pv}`}>{glyph(pv)}</span>}
          </button>
        );
      })}
    </div>
  );
}
