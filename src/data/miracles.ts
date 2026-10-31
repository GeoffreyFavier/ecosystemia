import type { MiracleDef } from '../engine/types.ts';

export const MIRACLES: readonly MiracleDef[] = [
  {
    id: 'sow',
    name: 'Semer',
    description: 'Une Graine sur un Vide ou une Cendre.',
    cost: 2,
    target: ['void', 'ash'],
    effect: { type: 'setElement', element: 'seed' },
    createsLife: true,
  },
  {
    id: 'spring',
    name: 'Source',
    description: 'Une Eau sur un Vide.',
    cost: 4,
    target: 'void',
    effect: { type: 'setElement', element: 'water' },
    createsLife: false,
  },
  {
    id: 'raise',
    name: 'Soulever',
    description: 'Altitude +1 sur une case (maximum 2).',
    cost: 3,
    target: 'any',
    effect: { type: 'raise' },
    createsLife: false,
  },
  {
    id: 'ignite',
    name: 'Embraser',
    description: 'Un Feu sur un végétal (brûlis volontaire).',
    cost: 1,
    target: 'vegetal',
    effect: { type: 'setElement', element: 'fire' },
    createsLife: false,
  },
];

export const MIRACLE_BY_ID: Record<string, MiracleDef> = Object.fromEntries(MIRACLES.map((m) => [m.id, m]));
