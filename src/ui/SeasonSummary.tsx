import { GOAL } from '../data/constants.ts';
import type { SeasonSummary as Summary } from '../engine/index.ts';
import { lawName } from './names.ts';

interface Props {
  summary: Summary;
  final: boolean;
  onContinue: () => void;
}

export function SeasonSummary({ summary: s, final, onContinue }: Props) {
  const changes = Object.entries(s.changesByLaw).sort((a, b) => b[1] - a[1]);
  const lawBonus = Object.entries(s.essenceFromLaws);
  return (
    <section class="panel summary">
      <h2>Fin de la saison {s.season}</h2>
      <p class="big">
        Essence <strong>+{s.essenceGained}</strong> <small>({s.essenceBefore} → {s.essenceAfter})</small>
      </p>
      <ul class="plain">
        {s.essenceFromPlants > 0 && <li>Plantes : +{s.essenceFromPlants}</li>}
        {s.essenceFromForests > 0 && <li>Forêts : +{s.essenceFromForests}</li>}
        {s.essenceFromCycles > 0 && <li>Pendant la saison : +{s.essenceFromCycles}</li>}
        {lawBonus.map(([id, n]) => (
          <li key={id}>
            {lawName(id)} : +{n}
          </li>
        ))}
      </ul>
      <h3>Changements par loi</h3>
      {changes.length === 0 ? (
        <p class="hint">Le monde n’a pas bougé.</p>
      ) : (
        <ul class="plain">
          {changes.map(([id, n]) => (
            <li key={id}>
              {lawName(id)} : <strong>{n}</strong>
            </li>
          ))}
        </ul>
      )}
      <h3>Objectif</h3>
      <p>
        Végétaux {s.vegetal}/{GOAL.vegetal} · Forêts {s.forests}/{GOAL.forests}
      </p>
      <button class="btn primary" onClick={onContinue}>
        {final ? 'Voir le résultat' : 'Saison suivante'}
      </button>
    </section>
  );
}
