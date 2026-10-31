import { GOAL } from '../data/constants.ts';
import type { GameState } from '../engine/index.ts';
import { lawName } from './names.ts';

interface Props {
  game: GameState;
  onNew: () => void;
  onReplay: () => void;
  /** Dismiss the overlay to look at the final world. */
  onClose: () => void;
}

export function EndScreen({ game, onNew, onReplay, onClose }: Props) {
  const won = game.phase === 'won';
  const last = game.history[game.history.length - 1];
  const totals: Record<string, number> = {};
  for (const h of game.history) for (const [id, n] of Object.entries(h.changesByLaw)) totals[id] = (totals[id] ?? 0) + n;
  const top = Object.entries(totals).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const essenceTotal = game.history.reduce((s, h) => s + h.essenceGained, 0);
  return (
    <section class={`panel end ${won ? 'victory' : 'defeat'}`}>
      <h2>{won ? 'Le monde est né' : game.lossReason === 'deadWorld' ? 'Le monde s’est éteint' : 'Le monde reste inachevé'}</h2>
      <p>
        {won
          ? `Une vie foisonnante couvre désormais la terre. Victoire à la saison ${game.season}.`
          : game.lossReason === 'deadWorld'
            ? 'Plus aucune vie, plus assez d’Essence pour la ranimer.'
            : `Les cinq saisons sont écoulées sans que l’objectif (${GOAL.vegetal} végétaux dont ${GOAL.forests} Forêts) soit atteint.`}
      </p>
      <ul class="plain stats">
        <li>Saisons jouées : <strong>{game.history.length}</strong></li>
        <li>Végétaux finaux : <strong>{last?.vegetal ?? 0}</strong> (Forêts : <strong>{last?.forests ?? 0}</strong>)</li>
        <li>Essence gagnée au total : <strong>{essenceTotal}</strong></li>
        <li>Cycles écoulés : <strong>{game.cycle}</strong></li>
        <li>Grimoire final : {game.grimoire.map(lawName).join(', ')}</li>
        {top.length > 0 && <li>Lois les plus actives : {top.map(([id, n]) => `${lawName(id)} (${n})`).join(', ')}</li>}
        <li>Graine : <strong>{game.seed}</strong></li>
      </ul>
      <div class="row">
        <button class="btn primary" onClick={onNew}>
          Nouvelle partie
        </button>
        <button class="btn" onClick={onReplay}>
          Rejouer cette graine
        </button>
        <button class="btn ghost" onClick={onClose}>
          Voir le monde
        </button>
      </div>
    </section>
  );
}
