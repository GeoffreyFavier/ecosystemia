// Best result (stars) per seed, kept in localStorage.

const KEY = 'genese.best.v1';

export type BestMap = Record<string, number>;

/** Pure: returns the updated map and whether `stars` is a new record for this seed. */
export function mergeBest(best: BestMap, seed: number, stars: number): { best: BestMap; isNew: boolean; previous: number } {
  const previous = best[String(seed)] ?? 0;
  if (stars <= previous) return { best, isNew: false, previous };
  return { best: { ...best, [String(seed)]: stars }, isNew: true, previous };
}

export function loadBest(): BestMap {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as unknown;
    if (!raw || typeof raw !== 'object') return {};
    return Object.fromEntries(Object.entries(raw).filter(([, v]) => typeof v === 'number' && v >= 0 && v <= 3)) as BestMap;
  } catch {
    return {};
  }
}

export function saveBest(best: BestMap): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(best));
  } catch {
    /* storage unavailable: ratings are just not remembered */
  }
}

export const starString = (stars: number): string => '★'.repeat(stars) + '☆'.repeat(Math.max(0, 3 - stars));
