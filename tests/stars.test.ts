import { describe, expect, it } from 'vitest';
import { starsFor, starsForSeason } from '../src/engine/season.ts';
import { makeState } from './helpers.ts';
import { mergeBest } from '../src/ui/best.ts';

describe('victory stars', () => {
  it('3 stars up to season 3, 2 in season 4, 1 in season 5', () => {
    expect([1, 2, 3, 4, 5].map(starsForSeason)).toEqual([3, 3, 3, 2, 1]);
  });
  it('only a won game earns stars', () => {
    expect(starsFor(makeState([], { phase: 'won', season: 4 }))).toBe(2);
    expect(starsFor(makeState([], { phase: 'lost', season: 3 }))).toBe(0);
    expect(starsFor(makeState([], { phase: 'intervention', season: 3 }))).toBe(0);
  });
});

describe('best result per seed', () => {
  it('keeps the best and flags new records', () => {
    let m = mergeBest({}, 42, 2);
    expect(m).toMatchObject({ isNew: true, previous: 0, best: { '42': 2 } });
    m = mergeBest(m.best, 42, 1);
    expect(m.isNew).toBe(false);
    expect(m.best['42']).toBe(2);
    m = mergeBest(m.best, 42, 3);
    expect(m).toMatchObject({ isNew: true, previous: 2 });
    expect(m.best['42']).toBe(3);
    expect(mergeBest(m.best, 7, 1).best).toEqual({ '42': 3, '7': 1 });
  });
});
