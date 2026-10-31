import { DRAFT_SIZE, RARITY_WEIGHTS } from '../data/constants.ts';
import { LAW_BY_ID, POOL_IDS } from '../data/laws.ts';
import { createRng } from './rng.ts';
import type { GameState, Rarity } from './types.ts';

const TIERS: Rarity[] = ['common', 'uncommon', 'rare'];

/**
 * Draw the draft offer: pick a rarity tier by weight (60/30/10), then a law uniformly
 * inside the tier; no duplicates, no law already in the grimoire.
 * Consumes the state RNG. Returns a new state (draft is null if nothing is left to offer).
 */
export function drawDraft(state: GameState): GameState {
  const rng = createRng(state.rng);
  const left: Record<Rarity, string[]> = { common: [], uncommon: [], rare: [] };
  for (const id of POOL_IDS) {
    if (state.grimoire.includes(id)) continue;
    left[LAW_BY_ID[id]!.rarity].push(id);
  }
  const offer: string[] = [];
  while (offer.length < DRAFT_SIZE) {
    const tiers = TIERS.filter((t) => left[t].length > 0);
    if (tiers.length === 0) break;
    const total = tiers.reduce((s, t) => s + RARITY_WEIGHTS[t], 0);
    let roll = rng.next() * total;
    let tier = tiers[tiers.length - 1]!;
    for (const t of tiers) {
      roll -= RARITY_WEIGHTS[t];
      if (roll < 0) {
        tier = t;
        break;
      }
    }
    const [id] = left[tier].splice(rng.int(0, left[tier].length - 1), 1);
    offer.push(id!);
  }
  return { ...state, rng: rng.state, draft: offer.length > 0 ? offer : null };
}
