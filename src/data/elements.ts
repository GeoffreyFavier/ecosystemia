import type { ElementId } from '../engine/types.ts';

export interface ElementDef {
  id: ElementId;
  name: string;
  emoji: string;
}

export const ELEMENTS: Record<ElementId, ElementDef> = {
  void: { id: 'void', name: 'Vide', emoji: '' },
  rock: { id: 'rock', name: 'Roche', emoji: '🪨' },
  water: { id: 'water', name: 'Eau', emoji: '💧' },
  seed: { id: 'seed', name: 'Graine', emoji: '🌰' },
  plant: { id: 'plant', name: 'Plante', emoji: '🌿' },
  forest: { id: 'forest', name: 'Forêt', emoji: '🌲' },
  fire: { id: 'fire', name: 'Feu', emoji: '🔥' },
  ash: { id: 'ash', name: 'Cendre', emoji: '' },
};

export const ELEMENT_IDS = Object.keys(ELEMENTS) as ElementId[];
