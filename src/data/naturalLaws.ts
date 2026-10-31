import type { NaturalLaw } from '../engine/types.ts';

/**
 * Natural laws are always active. Evaluation order matters:
 * catastrophes come before grimoire transformations, wear comes after.
 */
export const NATURAL_CATASTROPHES: readonly NaturalLaw[] = [
  {
    id: 'burnout',
    name: 'Combustion',
    description: 'Un Feu devient Cendre.',
    category: 'catastrophe',
    rule: { target: 'fire', conditions: [], result: 'ash' },
  },
  {
    id: 'spread',
    name: 'Embrasement',
    description: 'Un végétal avec au moins 1 Feu voisin (ortho) prend feu.',
    category: 'catastrophe',
    rule: {
      target: 'vegetal',
      conditions: [{ type: 'neighbors', element: 'fire', hood: 'ortho', min: 1 }],
      result: 'fire',
    },
  },
];

export const NATURAL_WEAR: readonly NaturalLaw[] = [
  {
    id: 'wither',
    name: 'Flétrissement',
    description: 'Une Graine d’âge 4 ou plus redevient Vide.',
    category: 'wear',
    rule: { target: 'seed', conditions: [{ type: 'minAge', value: 4 }], result: 'void' },
  },
  {
    id: 'settle',
    name: 'Tassement',
    description: 'Une Cendre d’âge 6 ou plus redevient Vide.',
    category: 'wear',
    rule: { target: 'ash', conditions: [{ type: 'minAge', value: 6 }], result: 'void' },
  },
];

export const NATURAL_LAWS: readonly NaturalLaw[] = [...NATURAL_CATASTROPHES, ...NATURAL_WEAR];
