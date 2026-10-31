import { useState } from 'preact/hooks';
import { GRIMOIRE_SLOTS } from '../data/constants.ts';
import { LAW_BY_ID } from '../data/laws.ts';
import { Grimoire } from './Grimoire.tsx';
import { LawRow } from './LawRow.tsx';
import { RARITY_LABEL } from './names.ts';

interface Props {
  offer: string[];
  grimoire: string[];
  onTake: (lawId: string, replaceIndex?: number) => void;
  onSkip: () => void;
}

/** "Révélation": choose 1 law out of 3, or pass. */
export function DraftPanel({ offer, grimoire, onTake, onSkip }: Props) {
  const [choice, setChoice] = useState<string | null>(null);
  const full = grimoire.length >= GRIMOIRE_SLOTS;

  if (choice) {
    return (
      <section class="panel revelation">
        <h2>Remplacer quelle loi ?</h2>
        <p class="hint">
          Le grimoire est plein. <strong>{LAW_BY_ID[choice]!.name}</strong> prendra la place de la loi choisie.
        </p>
        <Grimoire laws={grimoire} editable={false} onMove={() => {}} onRemove={() => {}} onReplace={(i) => onTake(choice, i)} bare />
        <button class="btn ghost small" onClick={() => setChoice(null)}>
          ← Retour
        </button>
      </section>
    );
  }

  return (
    <section class="panel revelation">
      <h2>Révélation</h2>
      <p class="hint">Une loi t’est révélée. Retiens-en une, ou passe.</p>
      <ul class="grimoire">
        {offer.map((id) => {
          const law = LAW_BY_ID[id]!;
          return <LawRow key={id} law={law} caption={RARITY_LABEL[law.rarity]} onClick={() => (full ? setChoice(id) : onTake(id))} />;
        })}
      </ul>
      <button class="btn ghost" onClick={onSkip}>
        Passer
      </button>
    </section>
  );
}
