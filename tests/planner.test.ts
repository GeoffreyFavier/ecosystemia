import { describe, expect, it } from 'vitest';
import { createPlannerPolicy, scoreState } from '../src/engine/ai/planner.ts';
import { playGame } from '../src/engine/policies.ts';
import { newGame } from '../src/engine/state.ts';
import { runSeason } from '../src/engine/season.ts';
import { makeState } from './helpers.ts';

const planner = createPlannerPolicy({ candidates: 6 });

describe('planner policy', () => {
  it('is deterministic for a given seed', () => {
    const a = playGame(11, planner);
    const b = playGame(11, planner);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('returns a launchable state and never overspends', () => {
    let state = newGame(4);
    while (state.phase === 'intervention') {
      const planned = planner(state);
      expect(planned.draft).toBeNull();
      expect(planned.essence).toBeGreaterThanOrEqual(0);
      expect(planned.phase).toBe('intervention');
      state = runSeason(planned).state;
    }
  });

  it('does not consume the game RNG', () => {
    const state = newGame(8);
    expect(planner(state).rng).toBe(state.rng);
  });

  it('scores vegetation, forests and spare essence; wins and losses dominate', () => {
    const a = makeState(['p'], { phase: 'intervention', essence: 0 });
    const b = makeState(['F'], { phase: 'intervention', essence: 0 });
    const c = makeState(['p'], { phase: 'intervention', essence: 30 });
    expect(scoreState(b)).toBeGreaterThan(scoreState(a));
    expect(scoreState(c)).toBeGreaterThan(scoreState(a));
    expect(scoreState({ ...a, phase: 'won' })).toBeGreaterThan(scoreState(b));
    expect(scoreState({ ...a, phase: 'lost' })).toBeLessThan(scoreState(a));
  });

  it('beats doing nothing on a typical world (a plan with miracles scores at least as well as the empty plan)', () => {
    const start = { ...newGame(2), draft: null };
    const planned = planner(start);
    expect(scoreState(runSeason(planned).state)).toBeGreaterThanOrEqual(scoreState(runSeason(start).state));
  });
});
