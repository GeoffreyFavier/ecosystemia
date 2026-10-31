import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/state.ts';
import { isValidSave } from '../src/ui/save.ts';

const save = (game = newGame(1)) => ({ game, lastRun: null, pending: false, debug: false });

describe('save validation', () => {
  it('accepts a current save', () => {
    expect(isValidSave(save())).toBe(true);
  });
  it('rejects a save from an older map size (e.g. 8x8)', () => {
    const s = save();
    s.game.grid = s.game.grid.slice(0, 64);
    expect(isValidSave(s)).toBe(false);
  });
  it('rejects unknown laws and garbage', () => {
    const s = save();
    s.game.grimoire = ['germination', 'no-such-law'];
    expect(isValidSave(s)).toBe(false);
    expect(isValidSave(null)).toBe(false);
    expect(isValidSave({})).toBe(false);
  });
});
