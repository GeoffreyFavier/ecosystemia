import { activeNaturalEvents, NATURAL_LAWS } from '../data/naturalLaws.ts';

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
        {activeNaturalEvents().map((e) => (
          <li key={e.id}>
            <span aria-hidden="true">{e.icon}</span> <strong>{e.name}</strong> <span class="law-kind">événement</span>
            <div class="law-desc">{e.description}</div>
          </li>
        ))}
      </ul>
    </details>
  );
}
