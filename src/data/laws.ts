import type { Law } from '../engine/types.ts';

/** Starting laws (in the grimoire at the start). They are not part of the draft pool. */
export const START_LAW_DEFS: readonly Law[] = [
  {
    id: 'germination',
    icon: '🌱',
    name: 'Germination',
    description: 'Graine avec ≥ 1 Eau voisine → Plante.',
    kind: 'transform',
    rarity: 'common',
    rule: {
      target: 'seed',
      conditions: [{ type: 'neighbors', element: 'water', min: 1 }],
      result: 'plant',
    },
  },
  {
    id: 'croissance',
    icon: '🌲',
    name: 'Croissance',
    description: 'Plante avec ≥ 3 végétaux voisins → Forêt.',
    kind: 'transform',
    rarity: 'common',
    rule: {
      target: 'plant',
      conditions: [{ type: 'neighbors', element: 'vegetal', min: 3 }],
      result: 'forest',
    },
  },
];

/** The draft pool (14 laws). */
export const POOL_LAW_DEFS: readonly Law[] = [
  {
    id: 'dissemination',
    icon: '🍃',
    name: 'Dissémination',
    description: 'Vide ou Cendre avec ≥ 2 Forêts voisines → Graine.',
    kind: 'transform',
    rarity: 'common',
    rule: {
      target: ['void', 'ash'],
      conditions: [{ type: 'neighbors', element: 'forest', min: 2 }],
      result: 'seed',
    },
  },
  {
    id: 'pollen',
    icon: '🌼',
    name: 'Pollen',
    description: 'Vide avec ≥ 3 Plantes voisines → Graine.',
    kind: 'transform',
    rarity: 'common',
    rule: {
      target: 'void',
      conditions: [{ type: 'neighbors', element: 'plant', min: 3 }],
      result: 'seed',
    },
  },
  {
    id: 'vent-ouest',
    icon: '💨',
    name: 'Vent d’ouest',
    description: 'Vide dont le voisin de l’ouest est un végétal → Graine.',
    kind: 'transform',
    rarity: 'uncommon',
    rule: {
      target: 'void',
      conditions: [{ type: 'direction', dir: 'O', element: 'vegetal' }],
      result: 'seed',
    },
  },
  {
    id: 'cendre-fertile',
    icon: '♻️',
    name: 'Cendre fertile',
    description: 'Cendre avec ≥ 1 végétal voisin → Plante.',
    kind: 'transform',
    rarity: 'common',
    rule: {
      target: 'ash',
      conditions: [{ type: 'neighbors', element: 'vegetal', min: 1 }],
      result: 'plant',
    },
  },
  {
    id: 'ruissellement',
    icon: '💦',
    name: 'Ruissellement',
    description: 'Vide avec une Eau plus haute juste à côté (ortho) → Eau.',
    kind: 'transform',
    rarity: 'common',
    rule: {
      target: 'void',
      conditions: [{ type: 'neighbors', element: 'water', min: 1, relativeAltitude: 'higher' }],
      result: 'water',
    },
  },
  {
    id: 'erosion',
    icon: '⏳',
    name: 'Érosion',
    description: 'Roche avec ≥ 3 Eaux voisines → Vide.',
    kind: 'transform',
    rarity: 'uncommon',
    rule: {
      target: 'rock',
      conditions: [{ type: 'neighbors', element: 'water', min: 3 }],
      result: 'void',
    },
  },
  {
    id: 'lichen',
    icon: '🍄',
    name: 'Lichen',
    description: 'Roche d’âge ≥ 6 avec ≥ 1 Forêt voisine → Plante.',
    kind: 'transform',
    rarity: 'rare',
    rule: {
      target: 'rock',
      conditions: [
        { type: 'minAge', value: 6 },
        { type: 'neighbors', element: 'forest', min: 1 },
      ],
      result: 'plant',
    },
  },
  {
    id: 'mangrove',
    icon: '🌊',
    name: 'Mangrove',
    description: 'Eau avec ≥ 3 Forêts voisines → Forêt.',
    kind: 'transform',
    rarity: 'rare',
    rule: {
      target: 'water',
      conditions: [{ type: 'neighbors', element: 'forest', min: 3 }],
      result: 'forest',
    },
  },
  {
    id: 'racines-humides',
    icon: '🛡️',
    name: 'Racines humides',
    description: 'Un végétal au bord de l’eau (ortho) ne change pas.',
    kind: 'protection',
    rarity: 'common',
    rule: {
      target: 'vegetal',
      conditions: [{ type: 'neighbors', element: 'water', min: 1 }],
    },
  },
  {
    id: 'pluie-cimes',
    icon: '🌧️',
    name: 'Pluie des cimes',
    description: 'Tous les 4 cycles, chaque Vide d’altitude haute → Eau.',
    kind: 'event',
    rarity: 'uncommon',
    period: 4,
    effect: {
      type: 'cells',
      target: 'void',
      conditions: [{ type: 'altitude', min: 2 }],
      result: 'water',
    },
  },
  {
    id: 'foudre',
    icon: '⚡',
    name: 'Foudre',
    description: 'Tous les 5 cycles, la Forêt la plus haute prend feu.',
    kind: 'event',
    rarity: 'rare',
    period: 5,
    effect: { type: 'pickHighest', target: 'forest', conditions: [], result: 'fire' },
  },
  {
    id: 'offrande',
    icon: '🙏',
    name: 'Offrande',
    description: '+1 Essence par Forêt en fin de saison.',
    kind: 'essence',
    rarity: 'uncommon',
    trigger: { type: 'seasonEnd', target: 'forest', conditions: [], amount: 1 },
  },
  {
    id: 'cycle-cendres',
    icon: '🕯️',
    name: 'Cycle des cendres',
    description: '+1 Essence chaque fois qu’un Feu devient Cendre.',
    kind: 'essence',
    rarity: 'uncommon',
    trigger: { type: 'onChange', from: 'fire', to: 'ash', amount: 1 },
  },
  {
    id: 'sources-sacrees',
    icon: '✨',
    name: 'Sources sacrées',
    description: 'En fin de saison, +1 Essence par Eau avec ≥ 1 Forêt voisine.',
    kind: 'essence',
    rarity: 'rare',
    trigger: {
      type: 'seasonEnd',
      target: 'water',
      conditions: [{ type: 'neighbors', element: 'forest', min: 1 }],
      amount: 1,
    },
  },
];

export const ALL_LAW_DEFS: readonly Law[] = [...START_LAW_DEFS, ...POOL_LAW_DEFS];
export const LAW_BY_ID: Record<string, Law> = Object.fromEntries(ALL_LAW_DEFS.map((l) => [l.id, l]));
export const POOL_IDS: readonly string[] = POOL_LAW_DEFS.map((l) => l.id);
