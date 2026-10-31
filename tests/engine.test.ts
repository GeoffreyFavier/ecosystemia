import { describe, expect, it } from 'vitest';
import { castMiracle, miracleTargets, previewCycle, takeDraftLaw, undoAllMiracles, undoMiracle } from '../src/engine/actions.ts';
import { registerCustomCondition } from '../src/engine/custom.ts';
import { stepCycle } from '../src/engine/cycle.ts';
import { naivePolicy, playGame } from '../src/engine/policies.ts';
import { finishSeason, launchSeason, runSeason } from '../src/engine/season.ts';
import { countElement, newGame } from '../src/engine/state.ts';
import { toIndex, neighborsOf } from '../src/engine/grid.ts';
import { GENERATION } from '../src/data/constants.ts';
import { LAW_BY_ID, POOL_IDS } from '../src/data/laws.ts';
import type { GameState } from '../src/engine/types.ts';
import { at, el, makeState } from './helpers.ts';

const step = (s: GameState, n = 1) => {
  let st = s;
  for (let i = 0; i < n; i++) st = stepCycle(st).state;
  return st;
};
const fullSeason = (s: GameState) => {
  let st = s;
  for (let i = 0; i < 8; i++) st = stepCycle(st).state;
  return st;
};

describe('determinism', () => {
  it('same seed → same game', () => {
    const a = playGame(42, naivePolicy);
    const b = playGame(42, naivePolicy);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
  it('different seeds → different worlds', () => {
    expect(JSON.stringify(newGame(1).grid)).not.toBe(JSON.stringify(newGame(2).grid));
  });
  it('same seed → same first draft', () => {
    expect(newGame(7).draft).toEqual(newGame(7).draft);
  });
});

describe('cycle rules', () => {
  it('is simultaneous: no cascade within one cycle', () => {
    // Seed (3,2) next to water (3,1) becomes a plant. Plant B (3,3) has only 2 vegetal neighbours
    // in the snapshot; it must NOT become a forest in the same cycle.
    const s = makeState(
      ['........', '...W....', '...s....', '..pp.p..', '....p...'],
      { grimoire: ['germination', 'croissance'] },
    );
    const r = step(s);
    expect(el(r, 3, 2)).toBe('plant');
    expect(el(r, 3, 3)).toBe('plant');
    // …but the next cycle it grows.
    expect(el(step(r), 3, 3)).toBe('forest');
  });

  it('applies transform laws in grimoire order', () => {
    const layout = ['........', '........', '..F.F...', '...a....'];
    const a = step(makeState(layout, { grimoire: ['dissemination', 'cendre-fertile'] }));
    const b = step(makeState(layout, { grimoire: ['cendre-fertile', 'dissemination'] }));
    expect(el(a, 3, 3)).toBe('seed');
    expect(el(b, 3, 3)).toBe('plant');
    expect(at(a, 3, 3).lastLawId).toBe('dissemination');
    expect(at(b, 3, 3).lastLawId).toBe('cendre-fertile');
  });

  it('Fire → Ash, and fire spreads one cell per cycle', () => {
    const s = makeState(['........', '........', '........', '*pppppp.']);
    const c1 = step(s);
    expect([el(c1, 0, 3), el(c1, 1, 3), el(c1, 2, 3)]).toEqual(['ash', 'fire', 'plant']);
    const c2 = step(c1);
    expect([el(c2, 1, 3), el(c2, 2, 3), el(c2, 3, 3)]).toEqual(['ash', 'fire', 'plant']);
  });

  it('fire does not spread diagonally (ortho only)', () => {
    const s = makeState(['........', '........', '..p.....', '.*......']);
    expect(el(step(s), 2, 2)).toBe('plant');
  });

  it('protection (Racines humides) blocks fire propagation', () => {
    // Plant (1,3) touches water (1,4) → protected. Plant (3,3) is not.
    const s = makeState(['........', '........', '........', '*p.p*...', '.W......'], {
      grimoire: ['racines-humides'],
    });
    const r = step(s);
    expect(el(r, 1, 3)).toBe('plant');
    expect(el(r, 3, 3)).toBe('fire');
  });

  it('without protection the same plant burns', () => {
    const s = makeState(['........', '........', '........', '*p......', '.W......']);
    expect(el(step(s), 1, 3)).toBe('fire');
  });

  it('seeds wither at age 4', () => {
    let s = makeState(['........', '...s....']);
    s = step(s, 4);
    expect(el(s, 3, 1)).toBe('seed');
    expect(at(s, 3, 1).age).toBe(4);
    s = step(s);
    expect(el(s, 3, 1)).toBe('void');
    expect(at(s, 3, 1).lastLawId).toBe('wither');
    expect(at(s, 3, 1).age).toBe(0);
  });

  it('ash settles to void at age 6', () => {
    let s = makeState(['........', '...a....']);
    s = step(s, 6);
    expect(el(s, 3, 1)).toBe('ash');
    expect(el(step(s), 3, 1)).toBe('void');
  });

  it('age resets on change and grows otherwise', () => {
    const s = makeState(['........', '..Ws....'], { grimoire: ['germination'] });
    s.grid[toIndex(0, 0)]!.age = 5;
    const r = step(s);
    expect(at(r, 3, 1).age).toBe(0);
    expect(at(r, 3, 1).lastLawId).toBe('germination');
    expect(at(r, 0, 0).age).toBe(6);
    expect(at(step(r), 3, 1).age).toBe(1);
  });

  it('Ruissellement follows altitude (ortho, strictly higher)', () => {
    // Water A (1,0) alt 2 → void below it (1,1) floods.
    // Water B (5,0) alt 1 same as void (5,1) → no flow. Water C (3,4) alt 0 below void (3,3) → no flow.
    // Water D (6,5) alt 2 is only diagonal to void (7,6) → no flow.
    const s = makeState(['.W...W..', '........', '........', '........', '...W....', '......W.', '........'], {
      grimoire: ['ruissellement'],
      alts: ['12111111', '11111111', '11111111', '11111111', '11101111', '11111121', '11111111'],
    });
    const r = step(s);
    expect(el(r, 1, 1)).toBe('water');
    expect(el(r, 5, 1)).toBe('void');
    expect(el(r, 3, 3)).toBe('void');
    expect(el(r, 7, 6)).toBe('void');
  });

  it('Ruissellement ignores equal altitude', () => {
    const s = makeState(['..W.....', '........'], { grimoire: ['ruissellement'] });
    expect(el(step(s), 2, 1)).toBe('void');
  });

  it('events act before cells and shield their targets for that cycle', () => {
    // Foudre at cycle 5 turns the forest into fire; it must still be fire (not ash) after the cycle.
    const s = makeState(['........', '...F....'], { grimoire: ['foudre'], cycle: 4 });
    const r = step(s);
    expect(el(r, 3, 1)).toBe('fire');
    expect(at(r, 3, 1).age).toBe(0);
    expect(el(step(r), 3, 1)).toBe('ash');
  });
});

describe('Foudre', () => {
  it('hits the highest forest', () => {
    const s = makeState(['F.......', '....F...', '........'], {
      grimoire: ['foudre'],
      cycle: 4,
      alts: ['10000000', '00002000'],
    });
    const r = step(s);
    expect(el(r, 4, 1)).toBe('fire');
    expect(el(r, 0, 0)).toBe('forest');
  });
  it('breaks ties by row-major order', () => {
    const s = makeState(['........', '..F.....', '........', '......F.'], {
      grimoire: ['foudre'],
      cycle: 4,
      alts: ['11111111', '11211111', '11111111', '11111121'],
    });
    const r = step(s);
    expect(el(r, 2, 1)).toBe('fire');
    expect(el(r, 6, 3)).toBe('forest');
  });
  it('does nothing without forest', () => {
    const s = makeState(['..p.....'], { grimoire: ['foudre'], cycle: 4 });
    const { events } = stepCycle(s);
    expect(events.filter((e) => e.lawId === 'foudre')).toHaveLength(0);
  });
});

describe('event periodicity (global cycle number)', () => {
  it('Pluie des cimes fires on cycles 4 and 8 only', () => {
    let s = makeState(['........', '........'], { grimoire: ['pluie-cimes'], alts: ['22222222'] });
    const fired: number[] = [];
    for (let i = 0; i < 8; i++) {
      const r = stepCycle(s);
      s = r.state;
      if (r.events.some((e) => e.lawId === 'pluie-cimes')) fired.push(s.cycle);
      // Rain only affects Void, so after the first rain there is no more work to do on row 0.
      for (const c of s.grid) if (c.element === 'water') c.element = 'void';
    }
    expect(fired).toEqual([4, 8]);
  });
  it('uses the global cycle, not the cycle in the season', () => {
    const s = makeState(['........'], { grimoire: ['pluie-cimes'], alts: ['22222222'], cycle: 3 });
    expect(stepCycle(s).events.some((e) => e.lawId === 'pluie-cimes')).toBe(true);
  });
});

describe('essence and season end', () => {
  const finish = (s: GameState) => finishSeason(fullSeason(s));
  it('+1 per Plant, +2 per Forest', () => {
    // Plants kept isolated so nothing changes during the season (no grimoire).
    const s = makeState(['p.p.p...', '........', 'F...F...'], { essence: 5 });
    const { summary, state } = finish(s);
    expect(summary.essenceFromPlants).toBe(3);
    expect(summary.essenceFromForests).toBe(4);
    expect(state.essence).toBe(5 + 7);
  });
  it('Offrande and Sources sacrées add season-end bonuses', () => {
    const s = makeState(['WF......', 'F.......'], { grimoire: ['offrande', 'sources-sacrees'], essence: 0 });
    const { summary } = finish(s);
    expect(summary.essenceFromLaws['offrande']).toBe(2);
    expect(summary.essenceFromLaws['sources-sacrees']).toBe(1);
    expect(summary.essenceGained).toBe(4 + 2 + 1);
  });
  it('Cycle des cendres gives +1 per Fire turned to Ash', () => {
    const s = makeState(['**......'], { grimoire: ['cycle-cendres'], essence: 0 });
    const r = stepCycle(s);
    expect(r.essenceGained).toBe(2);
    expect(r.state.essence).toBe(2);
  });
  it('essence from natural fire burnout needs the law', () => {
    const r = stepCycle(makeState(['**......'], { essence: 0 }));
    expect(r.essenceGained).toBe(0);
  });
});

describe('victory and defeat', () => {
  it('wins immediately when the objective is met at season end', () => {
    // 24 forests (no fire, nothing changes).
    const rows = ['FFFFFFFF', 'FFFFFFFF', 'FFFFFFFF'];
    const r = runSeason(makeState(rows, { phase: 'intervention' }));
    expect(r.state.phase).toBe('won');
    expect(r.summary.goalReached).toBe(true);
  });
  it('needs enough forests, not only plants', () => {
    const rows = ['pppppppp', 'pppppppp', 'pppppppp', 'F.......', 'F.......'];
    const r = runSeason(makeState(rows, { phase: 'intervention' }));
    // 26 vegetal but 2 forests → no win (and no grimoire so plants stay plants)
    expect(r.summary.vegetal).toBe(26);
    expect(r.state.phase).toBe('intervention');
    expect(r.state.season).toBe(2);
    expect(r.state.draft).not.toBeNull();
  });
  it('loses when the objective is missed after season 5', () => {
    const r = runSeason(makeState(['pF......'], { phase: 'intervention', season: 5 }));
    expect(r.state.phase).toBe('lost');
    expect(r.state.lossReason).toBe('objective');
  });
  it('loses when the world is dead (no life, essence below the cheapest life miracle)', () => {
    const r = runSeason(makeState(['R.......'], { phase: 'intervention', essence: 1 }));
    expect(r.state.phase).toBe('lost');
    expect(r.state.lossReason).toBe('deadWorld');
  });
  it('is not dead with enough Essence to sow, or with a seed', () => {
    expect(runSeason(makeState(['R.......'], { phase: 'intervention', essence: 2 })).state.phase).toBe('intervention');
    const withSeed = runSeason(makeState(['Rs......'], { phase: 'intervention', essence: 0 }));
    // Seed (age 0..7) withers during the season → dead at the end.
    expect(withSeed.state.lossReason).toBe('deadWorld');
  });
  it('launching requires the draft to be resolved', () => {
    expect(() => launchSeason(newGame(3))).toThrow();
  });
});

describe('journal', () => {
  it('records from/to/law and replays onto the grid', () => {
    const s = makeState(['........', '..Ws....'], { grimoire: ['germination'] });
    const { events } = stepCycle(s);
    expect(events).toEqual([{ index: toIndex(3, 1), from: 'seed', to: 'plant', lawId: 'germination' }]);
  });
  it('runSeason returns 8 cycle logs with global numbers', () => {
    const s = makeState(['........'], { phase: 'intervention' });
    const r = runSeason(s);
    expect(r.cycles.map((c) => c.cycle)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

describe('draft, grimoire and miracles', () => {
  it('draft offers 3 distinct laws, none already in the grimoire', () => {
    for (let seed = 1; seed < 50; seed++) {
      const g = newGame(seed);
      expect(g.draft).toHaveLength(3);
      expect(new Set(g.draft).size).toBe(3);
      for (const id of g.draft!) {
        expect(POOL_IDS).toContain(id);
        expect(g.grimoire).not.toContain(id);
      }
    }
  });
  it('full grimoire requires replacing a law', () => {
    let g = newGame(5);
    g = { ...g, grimoire: ['germination', 'croissance', 'pollen', 'erosion', 'lichen'] };
    g = { ...g, draft: ['mangrove', 'foudre', 'offrande'] };
    expect(() => takeDraftLaw(g, 'foudre')).toThrow();
    const r = takeDraftLaw(g, 'foudre', 4);
    expect(r.grimoire[4]).toBe('foudre');
    expect(r.draft).toBeNull();
  });
  it('miracles cost essence, can be stacked and undone', () => {
    let g = newGame(9);
    g.draft = null;
    const sowTarget = miracleTargets(g, 'sow')[0]!;
    const start = g.essence;
    g = castMiracle(g, 'sow', sowTarget);
    expect(g.essence).toBe(start - 2);
    expect(g.grid[sowTarget]!.element).toBe('seed');
    const before = g.grid.map((c) => ({ ...c }));
    const high = g.grid.findIndex((c) => c.altitude === 1);
    g = castMiracle(g, 'raise', high);
    expect(g.grid[high]!.altitude).toBe(2);
    expect(miracleTargets(g, 'raise')).not.toContain(high);
    g = undoMiracle(g);
    expect(g.grid).toEqual(before);
    g = undoAllMiracles(g);
    expect(g.essence).toBe(start);
    expect(g.grid[sowTarget]!.element).not.toBe('seed');
  });
  it('miracles are greyed out without Essence and respect targets', () => {
    const g = { ...newGame(9), essence: 0 };
    expect(miracleTargets(g, 'sow')).toEqual([]);
    const g2 = { ...newGame(9), essence: 10 };
    for (const i of miracleTargets(g2, 'ignite')) expect(['plant', 'forest']).toContain(g2.grid[i]!.element);
    for (const i of miracleTargets(g2, 'spring')) expect(g2.grid[i]!.element).toBe('void');
  });
  it('preview matches the real next cycle', () => {
    const g = makeState(['........', '..Ws....', '.pF.p...'], {
      grimoire: ['germination', 'croissance'],
      phase: 'intervention',
    });
    const preview = previewCycle(g);
    const real = stepCycle({ ...g, phase: 'running' }).events;
    expect(preview).toEqual(real);
    expect(g.phase).toBe('intervention');
  });
});

describe('custom escape hatch', () => {
  it('runs a registered custom condition inside a law', () => {
    registerCustomCondition('only-first-column', (_grid, index) => index % 8 === 0);
    LAW_BY_ID['test-custom'] = {
      id: 'test-custom',
      name: 'Test',
      description: 'test',
      kind: 'transform',
      rarity: 'common',
      rule: { target: 'void', conditions: [{ type: 'custom', id: 'only-first-column' }], result: 'rock' },
    };
    const r = step(makeState(['........'], { grimoire: ['test-custom'] }));
    expect(el(r, 0, 0)).toBe('rock');
    expect(el(r, 1, 0)).toBe('void');
    delete LAW_BY_ID['test-custom'];
  });
});

describe('world generation', () => {
  it('respects all constraints over many seeds', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { grid } = newGame(seed);
      expect(grid).toHaveLength(64);
      // 3 altitude levels
      expect(new Set(grid.map((c) => c.altitude)).size).toBe(3);
      // lake: connected, low, right size
      const water = grid.map((c, i) => (c.element === 'water' ? i : -1)).filter((i) => i >= 0);
      expect(water.length).toBeGreaterThanOrEqual(GENERATION.lakeMin);
      expect(water.length).toBeLessThanOrEqual(GENERATION.lakeMax);
      for (const w of water) expect(grid[w]!.altitude).toBe(0);
      const seen = new Set([water[0]!]);
      const queue = [water[0]!];
      while (queue.length) {
        for (const n of neighborsOf(queue.pop()!, 'ortho')) {
          if (water.includes(n) && !seen.has(n)) {
            seen.add(n);
            queue.push(n);
          }
        }
      }
      expect(seen.size).toBe(water.length);
      // rocks, seeds
      const rocks = countElement(grid, 'rock');
      expect(rocks).toBeGreaterThanOrEqual(GENERATION.rocksMin);
      expect(rocks).toBeLessThanOrEqual(GENERATION.rocksMax);
      expect(countElement(grid, 'seed')).toBe(GENERATION.seeds);
      const wet = grid.filter(
        (c, i) => c.element === 'seed' && neighborsOf(i, 'moore').some((n) => grid[n]!.element === 'water'),
      ).length;
      expect(wet).toBeGreaterThanOrEqual(GENERATION.seedsNearWater);
      // everything else is void
      const others = grid.filter((c) => !['water', 'rock', 'seed', 'void'].includes(c.element));
      expect(others).toHaveLength(0);
    }
  });
  it('puts rocks on high ground when possible', () => {
    let high = 0;
    let total = 0;
    for (let seed = 1; seed <= 100; seed++) {
      for (const c of newGame(seed).grid) {
        if (c.element === 'rock') {
          total++;
          if (c.altitude === 2) high++;
        }
      }
    }
    expect(high / total).toBeGreaterThan(0.7);
  });
});
