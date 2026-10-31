import { GOAL, MAX_SEASONS } from '../data/constants.ts';

interface Props {
  season: number;
  essence: number;
  vegetal: number;
  forests: number;
}

function Bar({ label, value, goal }: { label: string; value: number; goal: number }) {
  const done = value >= goal;
  return (
    <div class="goal">
      <div class="goal-text">
        <span>{label}</span>
        <span class={done ? 'ok' : ''}>
          {value}/{goal}
        </span>
      </div>
      <div class="bar">
        <div class={`bar-fill ${done ? 'done' : ''}`} style={{ width: `${Math.min(100, (100 * value) / goal)}%` }} />
      </div>
    </div>
  );
}

export function Header({ season, essence, vegetal, forests }: Props) {
  return (
    <header class="header">
      <div class="title-row">
        <h1>
          Âge I — Saison {season}/{MAX_SEASONS}
        </h1>
        <div class="essence" title="Essence">
          ✦ {essence}
        </div>
      </div>
      <div class="goals">
        <Bar label="Végétaux" value={vegetal} goal={GOAL.vegetal} />
        <Bar label="Forêts" value={forests} goal={GOAL.forests} />
      </div>
    </header>
  );
}
