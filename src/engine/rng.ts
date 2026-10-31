// Seeded RNG (mulberry32). The RNG state is a single 32-bit integer stored in the game state.

export interface Rng {
  /** Float in [0, 1). */
  next(): number;
  /** Integer in [min, max], both included. */
  int(min: number, max: number): number;
  pick<T>(items: readonly T[]): T;
  /** Returns a shuffled copy (Fisher-Yates). */
  shuffle<T>(items: readonly T[]): T[];
  /** Current internal state, to be stored back in the game state. */
  readonly state: number;
}

export function createRng(initialState: number): Rng {
  let s = initialState | 0;
  const next = (): number => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));
  return {
    next,
    int,
    pick: (items) => items[Math.floor(next() * items.length)]!,
    shuffle: (items) => {
      const a = items.slice();
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a[i], a[j]] = [a[j]!, a[i]!];
      }
      return a;
    },
    get state() {
      return s;
    },
  };
}
