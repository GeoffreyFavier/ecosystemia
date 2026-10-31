// Balance variants compared by `npm run sim -- --sweep`. They are NEVER applied to the game:
// the defaults live in constants.ts / laws.ts. Variant A is "as is" (the reference).

export interface BalanceVariant {
  id: string;
  label: string;
  /** Overrides GOAL.vegetal. */
  goalVegetal?: number;
  /** Overrides GOAL.forests. */
  goalForests?: number;
  /** Overrides the starting Essence. */
  startEssence?: number;
  /** Overrides the Croissance rule: Plant with ≥ minNeighbors vegetal neighbors and age ≥ minAge → Forest. */
  croissance?: { minNeighbors: number; minAge: number };
}

export const VARIANTS: readonly BalanceVariant[] = [
  { id: 'A', label: 'Réglages actuels (référence)' },
  { id: 'B', label: 'GOAL.forests = 12', goalForests: 12 },
  { id: 'C', label: 'Essence de départ = 15', startEssence: 15 },
  { id: 'D', label: 'Croissance ≥ 2 voisins végétaux et Plante d’âge ≥ 2', croissance: { minNeighbors: 2, minAge: 2 } },
  { id: 'E', label: 'B + C', goalForests: 12, startEssence: 15 },
  // Extra variants (not requested): intermediate points to bracket the target.
  { id: 'F', label: 'Essence de départ = 12', startEssence: 12 },
  { id: 'G', label: 'B + Essence de départ = 12', goalForests: 12, startEssence: 12 },
  { id: 'H', label: 'Croissance ≥ 2 voisins végétaux et Plante d’âge ≥ 4', croissance: { minNeighbors: 2, minAge: 4 } },
  { id: 'I', label: 'D + objectif 40 végétaux dont 24 Forêts', goalForests: 24, croissance: { minNeighbors: 2, minAge: 2 } },
  { id: 'J', label: 'D + objectif 50 végétaux dont 30 Forêts', goalVegetal: 50, goalForests: 30, croissance: { minNeighbors: 2, minAge: 2 } },
  { id: 'K', label: 'D + objectif 55 végétaux dont 35 Forêts', goalVegetal: 55, goalForests: 35, croissance: { minNeighbors: 2, minAge: 2 } },
];
