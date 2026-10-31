import { NATURAL_LAWS } from '../data/naturalLaws.ts';

export function NaturalLaws() {
  return (
    <details class="panel">
      <summary>Lois naturelles (toujours actives)</summary>
      <ul class="natural">
        {NATURAL_LAWS.map((l) => (
          <li key={l.id}>
            <span aria-hidden="true">{l.icon}</span> <strong>{l.name}</strong> <span class="law-kind">{l.category === 'catastrophe' ? 'catastrophe' : 'usure'}</span>
            <div class="law-desc">{l.description}</div>
          </li>
        ))}
      </ul>
    </details>
  );
}
