// Balance constants. EVERY gameplay number lives in src/data/.

export const GRID_SIZE = 8;
export const MAX_SEASONS = 5;
export const CYCLES_PER_SEASON = 8;
export const START_ESSENCE = 10;
export const GRIMOIRE_SLOTS = 5;
export const START_LAWS: readonly string[] = ['germination', 'croissance'];
export const DRAFT_SIZE = 3;

/** Draft weights per rarity tier (60 / 30 / 10). */
export const RARITY_WEIGHTS = { common: 60, uncommon: 30, rare: 10 } as const;

export const GOAL = { vegetal: 24, forests: 8 } as const;

export const ESSENCE_PER_PLANT = 1;
export const ESSENCE_PER_FOREST = 2;

export const GENERATION = {
  smoothingPassesMin: 1,
  smoothingPassesMax: 2,
  /** Share of cells per altitude level, from lowest to highest (must sum to 1). */
  altitudeShares: [0.3, 0.4, 0.3],
  lakeMin: 4,
  lakeMax: 6,
  rocksMin: 6,
  rocksMax: 8,
  seeds: 4,
  seedsNearWater: 2,
} as const;
