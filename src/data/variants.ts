// Balance variants compared by `npm run sim -- --sweep`. They are NEVER applied to the game:
// the defaults live in constants.ts / laws.ts / naturalLaws.ts. "REF" is the current default (reference).

import type { Condition } from '../engine/types.ts';

export interface BalanceVariant {
  id: string;
  label: string;
  /** Overrides START.essence. */
  startEssence?: number;
  /** Overrides GOAL.vegetal / GOAL.forests. */
  goalVegetal?: number;
  goalForests?: number;
  /** Replaces the conditions of the Croissance rule (Plant → Forest). */
  croissance?: Condition[];
  /** Enables the optional natural event "Orage". */
  orage?: boolean;
}

// Croissance candidates (Plant → Forest). The default rule is "≥ 3 vegetal neighbors".
const veg = (min: number): Condition => ({ type: 'neighbors', element: 'vegetal', min });

/** R1: ≥ 3 vegetal, OR ≥ 2 vegetal if at least 1 Water neighbor. */
export const CROISSANCE_R1: Condition[] = [
  { type: 'anyOf', options: [[veg(3)], [veg(2), { type: 'neighbors', element: 'water', min: 1 }]] },
];
/** R2: ≥ 3 vegetal, OR ≥ 2 vegetal including at least 1 Forest. */
export const CROISSANCE_R2: Condition[] = [
  { type: 'anyOf', options: [[veg(3)], [veg(2), { type: 'neighbors', element: 'forest', min: 1 }]] },
];
/** R3: ≥ 2 vegetal AND Water within distance ≤ 2. */
export const CROISSANCE_R3: Condition[] = [veg(2), { type: 'within', element: 'water', distance: 2, min: 1 }];

export const VARIANTS: readonly BalanceVariant[] = [
  { id: 'REF', label: 'Référence (Essence 12, ≥ 3 végétaux)' },
  { id: 'REF-10', label: 'Référence, Essence 10', startEssence: 10 },
  { id: 'R1-12', label: 'R1 (≥ 3 végétaux, ou ≥ 2 avec Eau voisine), Essence 12', croissance: CROISSANCE_R1 },
  { id: 'R1-10', label: 'R1, Essence 10', croissance: CROISSANCE_R1, startEssence: 10 },
  { id: 'R2-12', label: 'R2 (≥ 3 végétaux, ou ≥ 2 dont 1 Forêt), Essence 12', croissance: CROISSANCE_R2 },
  { id: 'R2-10', label: 'R2, Essence 10', croissance: CROISSANCE_R2, startEssence: 10 },
  { id: 'R3-12', label: 'R3 (≥ 2 végétaux et Eau à distance ≤ 2), Essence 12', croissance: CROISSANCE_R3 },
  { id: 'R3-10', label: 'R3, Essence 10', croissance: CROISSANCE_R3, startEssence: 10 },
];
