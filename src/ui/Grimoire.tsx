import { GRIMOIRE_SLOTS } from '../data/constants.ts';
import { LAW_BY_ID } from '../data/laws.ts';
import { LawRow } from './LawRow.tsx';

interface Props {
  laws: string[];
  editable: boolean;
  onMove: (index: number, delta: -1 | 1) => void;
  onRemove: (index: number) => void;
  /** When set, each row shows a "Remplacer" button instead of the edit controls. */
  onReplace?: (index: number) => void;
  /** Render only the list (no panel frame / title). */
  bare?: boolean;
}

export function Grimoire({ laws, editable, onMove, onRemove, onReplace, bare }: Props) {
  const list = (
      <ol class="grimoire">
        {laws.map((id, i) => {
          const law = LAW_BY_ID[id]!;
          return (
            <LawRow key={id} law={law}>
              {onReplace ? (
                <button class="btn small" onClick={() => onReplace(i)}>
                  Remplacer
                </button>
              ) : (
                editable && (
                  <>
                    <button class="icon" aria-label="Monter" disabled={i === 0} onClick={() => onMove(i, -1)}>
                      ↑
                    </button>
                    <button class="icon" aria-label="Descendre" disabled={i === laws.length - 1} onClick={() => onMove(i, 1)}>
                      ↓
                    </button>
                    <button class="icon danger" aria-label="Retirer" onClick={() => onRemove(i)}>
                      ✕
                    </button>
                  </>
                )
              )}
            </LawRow>
          );
        })}
        {!bare &&
          Array.from({ length: GRIMOIRE_SLOTS - laws.length }, (_, i) => (
            <li key={`empty-${i}`} class="law empty">
              Emplacement libre
            </li>
          ))}
      </ol>
  );
  if (bare) return list;
  return (
    <section class="panel">
      <h2>
        Grimoire <small>{laws.length}/{GRIMOIRE_SLOTS}</small>
      </h2>
      <p class="hint">L’ordre compte : à égalité, la loi du haut l’emporte.</p>
      {list}
    </section>
  );
}
