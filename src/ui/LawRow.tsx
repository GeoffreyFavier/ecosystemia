import type { ComponentChildren } from 'preact';
import type { Law } from '../engine/index.ts';
import { kindLabel } from './names.ts';

interface Props {
  law: Law;
  /** Extra info in the small caption (e.g. rarity). */
  caption?: string;
  /** Controls on the right (buttons). */
  children?: ComponentChildren;
  onClick?: () => void;
}

/** Sober list row: icon, name, one-line effect. Used by the grimoire and the revelation. */
export function LawRow({ law, caption, children, onClick }: Props) {
  const body = (
    <>
      <span class="law-icon" aria-hidden="true">
        {law.icon}
      </span>
      <span class="law-main">
        <span class="law-kind">
          {kindLabel(law.kind)}
          {caption ? ` · ${caption}` : ''}
        </span>
        <strong>{law.name}</strong>
        <span class="law-desc">{law.description}</span>
      </span>
    </>
  );
  return (
    <li class={`law kind-${law.kind}`}>
      {onClick ? (
        <button class="law-pick" onClick={onClick}>
          {body}
        </button>
      ) : (
        body
      )}
      {children && <div class="law-actions">{children}</div>}
    </li>
  );
}
