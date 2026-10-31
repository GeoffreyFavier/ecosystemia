// Balance constants. EVERY gameplay number lives in src/data/.

/** Hex map, odd-r offset storage (pointy-top), row-major. */
export const GRID_COLS = 12;
export const GRID_ROWS = 9;
export const MAX_SEASONS = 5;
export const CYCLES_PER_SEASON = 8;
/** Mutable on purpose (the balance simulator overrides it to compare variants); never mutate in the game. */
export const START: { essence: number } = { essence: 10 };
export const GRIMOIRE_SLOTS = 5;
export const START_LAWS: readonly string[] = ['germination', 'croissance'];
export const DRAFT_SIZE = 3;

/** Draft weights per rarity tier (60 / 30 / 10). */
export const RARITY_WEIGHTS = { common: 60, uncommon: 30, rare: 10 } as const;

export const GOAL: { vegetal: number; forests: number } = { vegetal: 40, forests: 14 };

/** Victory rating: win in season ≤ maxSeason → stars (checked in order). */
export const STAR_THRESHOLDS: readonly { maxSeason: number; stars: number }[] = [
  { maxSeason: 3, stars: 3 },
  { maxSeason: 4, stars: 2 },
  { maxSeason: 5, stars: 1 },
];

export const ESSENCE_PER_PLANT = 1;
export const ESSENCE_PER_FOREST = 2;

export const GENERATION = {
  smoothingPassesMin: 1,
  smoothingPassesMax: 2,
  /** Share of cells per altitude level, from lowest to highest (must sum to 1). */
  altitudeShares: [0.3, 0.4, 0.3],
  lakes: 2,
  lakeMin: 4,
  lakeMax: 7,
  rocksMin: 10,
  rocksMax: 14,
  seeds: 6,
  seedsNearWater: 3,
} as const;
