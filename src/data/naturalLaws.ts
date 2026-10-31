import type { NaturalEvent, NaturalLaw } from '../engine/types.ts';

/**
 * Natural laws are always active. Evaluation order matters:
 * catastrophes come before grimoire transformations, wear comes after.
 */
export const NATURAL_CATASTROPHES: readonly NaturalLaw[] = [
  {
    id: 'burnout',
    icon: '🔥',
    name: 'Combustion',
    description: 'Un Feu devient Cendre.',
    category: 'catastrophe',
    rule: { target: 'fire', conditions: [], result: 'ash' },
  },
  {
    id: 'spread',
    icon: '🌋',
    name: 'Embrasement',
    description: 'Un végétal avec au moins 1 Feu voisin prend feu.',
    category: 'catastrophe',
    rule: {
      target: 'vegetal',
      conditions: [{ type: 'neighbors', element: 'fire', min: 1 }],
      result: 'fire',
    },
  },
];

export const NATURAL_WEAR: readonly NaturalLaw[] = [
  {
    id: 'wither',
    icon: '🥀',
    name: 'Flétrissement',
    description: 'Une Graine d’âge 4 ou plus redevient Vide.',
    category: 'wear',
    rule: { target: 'seed', conditions: [{ type: 'minAge', value: 4 }], result: 'void' },
  },
  {
    id: 'settle',
    icon: '🌫️',
    name: 'Tassement',
    description: 'Une Cendre d’âge 6 ou plus redevient Vide.',
    category: 'wear',
    rule: { target: 'ash', conditions: [{ type: 'minAge', value: 6 }], result: 'void' },
  },
];

export const NATURAL_LAWS: readonly NaturalLaw[] = [...NATURAL_CATASTROPHES, ...NATURAL_WEAR];

/** Optional adversity. `enabled` is false by default: nothing changes unless a variant turns it on. */
export const NATURAL_EVENTS: NaturalEvent[] = [
  {
    id: 'orage',
    icon: '⛈️',
    name: 'Orage',
    description: 'Tous les 8 cycles, la Forêt la plus haute prend feu.',
    period: 8,
    effect: { type: 'pickHighest', target: 'forest', conditions: [], result: 'fire' },
    enabled: false,
  },
];

export const activeNaturalEvents = (): NaturalEvent[] => NATURAL_EVENTS.filter((e) => e.enabled);
