import { useState } from 'preact/hooks';
import { GRIMOIRE_SLOTS } from '../data/constants.ts';
import { LAW_BY_ID } from '../data/laws.ts';
import { kindLabel, RARITY_LABEL } from './names.ts';
import { Grimoire } from './Grimoire.tsx';

interface Props {
  offer: string[];
  grimoire: string[];
  onTake: (lawId: string, replaceIndex?: number) => void;
  onSkip: () => void;
}

export function DraftPanel({ offer, grimoire, onTake, onSkip }: Props) {
  const [choice, setChoice] = useState<string | null>(null);
  const full = grimoire.length >= GRIMOIRE_SLOTS;

  if (choice) {
    return (
      <>
        <section class="panel">
          <h2>Remplacer quelle loi ?</h2>
          <p class="hint">
            Le grimoire est plein. <strong>{LAW_BY_ID[choice]!.name}</strong> prendra la place de la loi choisie.
          </p>
          <button class="btn ghost small" onClick={() => setChoice(null)}>
            ← Retour
          </button>
        </section>
        <Grimoire laws={grimoire} editable={false} onMove={() => {}} onRemove={() => {}} onReplace={(i) => onTake(choice, i)} />
      </>
    );
  }

  return (
    <section class="panel draft">
      <h2>Une nouvelle loi s’offre à toi</h2>
      <p class="hint">Choisis-en une, ou passe.</p>
      <div class="cards">
        {offer.map((id) => {
          const law = LAW_BY_ID[id]!;
          return (
            <button key={id} class={`card rarity-${law.rarity} kind-${law.kind}`} onClick={() => (full ? setChoice(id) : onTake(id))}>
              <span class="law-kind">
                {kindLabel(law.kind)} · {RARITY_LABEL[law.rarity]}
              </span>
              <strong>{law.name}</strong>
              <span class="law-desc">{law.description}</span>
            </button>
          );
        })}
      </div>
      <button class="btn ghost" onClick={onSkip}>
        Passer
      </button>
    </section>
  );
}
