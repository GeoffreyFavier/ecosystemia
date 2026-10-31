import { ELEMENTS } from '../data/elements.ts';
import { LAW_BY_ID } from '../data/laws.ts';
import { MIRACLE_BY_ID } from '../data/miracles.ts';
import { NATURAL_EVENTS, NATURAL_LAWS } from '../data/naturalLaws.ts';
import type { ElementId, Law } from '../engine/types.ts';

/** Display name of any law id: grimoire law, natural law or miracle. */
export function lawName(id: string | null): string {
  if (!id) return '—';
  if (LAW_BY_ID[id]) return LAW_BY_ID[id]!.name;
  const nat = NATURAL_LAWS.find((l) => l.id === id);
  if (nat) return `${nat.name} (naturelle)`;
  if (NATURAL_EVENTS.some((e) => e.id === id)) return `${NATURAL_EVENTS.find((e) => e.id === id)!.name} (naturel)`;
  if (id.startsWith('miracle.')) return `Miracle : ${MIRACLE_BY_ID[id.slice(8)]?.name ?? id.slice(8)}`;
  return id;
}

export const elementName = (e: ElementId): string => ELEMENTS[e].name;

/** Small glyph for an element; Void and Ash have no emoji so they get a neutral mark. */
export function glyph(e: ElementId): string {
  return ELEMENTS[e].emoji || (e === 'ash' ? '▪' : '○');
}

const KIND_LABEL: Record<Law['kind'], string> = {
  transform: 'Transformation',
  protection: 'Protection',
  event: 'Événement',
  essence: 'Essence',
};
export const kindLabel = (kind: Law['kind']): string => KIND_LABEL[kind];

export const RARITY_LABEL = { common: 'commune', uncommon: 'peu commune', rare: 'rare' } as const;
