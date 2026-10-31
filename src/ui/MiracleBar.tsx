import { MIRACLES } from '../data/miracles.ts';

interface Props {
  essence: number;
  selected: string | null;
  cast: number;
  onSelect: (id: string | null) => void;
  onUndo: () => void;
  onUndoAll: () => void;
}

export function MiracleBar({ essence, selected, cast, onSelect, onUndo, onUndoAll }: Props) {
  const current = MIRACLES.find((m) => m.id === selected);
  return (
    <section class="panel">
      <h2>Miracles</h2>
      <div class="miracles">
        {MIRACLES.map((m) => {
          const affordable = essence >= m.cost;
          return (
            <button
              key={m.id}
              class={`miracle ${selected === m.id ? 'active' : ''}`}
              disabled={!affordable}
              onClick={() => onSelect(selected === m.id ? null : m.id)}
              title={m.description}
            >
              <span class="m-name">{m.name}</span>
              <span class="m-cost">✦ {m.cost}</span>
            </button>
          );
        })}
      </div>
      <p class="hint">{current ? `${current.name} : ${current.description} Touche une case en surbrillance.` : 'Touche un miracle, puis une case.'}</p>
      {cast > 0 && (
        <div class="row">
          <button class="btn small ghost" onClick={onUndo}>
            ↶ Annuler le dernier
          </button>
          <button class="btn small ghost" onClick={onUndoAll}>
            Tout annuler ({cast})
          </button>
        </div>
      )}
    </section>
  );
}
