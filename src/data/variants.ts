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

export const VARIANTS: readonly BalanceVariant[] = [
  { id: 'REF', label: 'Référence actuelle (Essence 12, ≥ 3 végétaux)' },
  { id: 'REF-10', label: 'Référence avec Essence 10', startEssence: 10 },
];
