import { describe, expect, it } from 'vitest';
import { castMiracle, miracleTargets, previewCycle, takeDraftLaw, undoAllMiracles, undoMiracle } from '../src/engine/actions.ts';
import { registerCustomCondition } from '../src/engine/custom.ts';
import { stepCycle } from '../src/engine/cycle.ts';
import { naivePolicy, playGame } from '../src/engine/policies.ts';
import { finishSeason, launchSeason, runSeason } from '../src/engine/season.ts';
import { countElement, newGame } from '../src/engine/state.ts';
import { DIRS, neighborsOf, toIndex } from '../src/engine/grid.ts';
import { GENERATION, GOAL, GRID_COLS, GRID_ROWS } from '../src/data/constants.ts';
import { LAW_BY_ID, POOL_IDS } from '../src/data/laws.ts';
import type { GameState } from '../src/engine/types.ts';
import { at, el, makeState, nb, put } from './helpers.ts';

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
    // Seed S next to water becomes a plant. Plant B (west of S) has only 2 vegetal neighbours in the
    // snapshot; it must NOT become a forest in the same cycle.
    const s = makeState([], { grimoire: ['germination', 'croissance'] });
    const S: [number, number] = [5, 4];
    const B = nb(...S, 'O');
    put(s, ...S, 's');
    put(s, ...nb(...S, 'E'), 'W');
    put(s, ...B, 'p');
    put(s, ...nb(...B, 'O'), 'p');
    put(s, ...nb(...B, 'NO'), 'p');
    const r = step(s);
    expect(el(r, ...S)).toBe('plant');
    expect(el(r, ...B)).toBe('plant');
    // …but the next cycle it grows (3 vegetal neighbours now).
    expect(el(step(r), ...B)).toBe('forest');
  });

  it('applies transform laws in grimoire order', () => {
    const A: [number, number] = [5, 4];
    const build = (grimoire: string[]) => {
      const s = makeState([], { grimoire });
      put(s, ...A, 'a');
      put(s, ...nb(...A, 'E'), 'F');
      put(s, ...nb(...A, 'O'), 'F');
      return s;
    };
    const a = step(build(['dissemination', 'cendre-fertile']));
    const b = step(build(['cendre-fertile', 'dissemination']));
    expect(el(a, ...A)).toBe('seed');
    expect(el(b, ...A)).toBe('plant');
    expect(at(a, ...A).lastLawId).toBe('dissemination');
    expect(at(b, ...A).lastLawId).toBe('cendre-fertile');
  });

  it('Fire → Ash, and fire spreads one cell per cycle', () => {
    const s = makeState(['', '', '', '*pppppp']);
    const c1 = step(s);
    expect([el(c1, 0, 3), el(c1, 1, 3), el(c1, 2, 3)]).toEqual(['ash', 'fire', 'plant']);
    const c2 = step(c1);
    expect([el(c2, 1, 3), el(c2, 2, 3), el(c2, 3, 3)]).toEqual(['ash', 'fire', 'plant']);
  });

  it('fire reaches all 6 neighbors, and only them', () => {
    const C: [number, number] = [5, 4];
    const s = makeState();
    put(s, ...C, '*');
    for (const d of DIRS) put(s, ...nb(...C, d), 'p');
    const far = nb(...nb(...C, 'E'), 'E');
    put(s, ...far, 'p');
    const r = step(s);
    for (const d of DIRS) expect(el(r, ...nb(...C, d))).toBe('fire');
    expect(el(r, ...far)).toBe('plant');
    expect(el(r, ...C)).toBe('ash');
  });

  it('protection (Racines humides) blocks fire propagation', () => {
    const F: [number, number] = [5, 4];
    const s = makeState([], { grimoire: ['racines-humides'] });
    put(s, ...F, '*');
    const wet = nb(...F, 'E');
    const dry = nb(...F, 'O');
    put(s, ...wet, 'p');
    put(s, ...nb(...wet, 'E'), 'W');
    put(s, ...dry, 'p');
    const r = step(s);
    expect(el(r, ...wet)).toBe('plant');
    expect(el(r, ...dry)).toBe('fire');
  });

  it('without protection the same plant burns', () => {
    const F: [number, number] = [5, 4];
    const s = makeState();
    put(s, ...F, '*');
    const wet = nb(...F, 'E');
    put(s, ...wet, 'p');
    put(s, ...nb(...wet, 'E'), 'W');
    expect(el(step(s), ...wet)).toBe('fire');
  });

  it('seeds wither at age 4', () => {
    let s = makeState(['', '...s']);
    s = step(s, 4);
    expect(el(s, 3, 1)).toBe('seed');
    expect(at(s, 3, 1).age).toBe(4);
    s = step(s);
    expect(el(s, 3, 1)).toBe('void');
    expect(at(s, 3, 1).lastLawId).toBe('wither');
    expect(at(s, 3, 1).age).toBe(0);
  });

  it('ash settles to void at age 6', () => {
    let s = makeState(['', '...a']);
    s = step(s, 6);
    expect(el(s, 3, 1)).toBe('ash');
    expect(el(step(s), 3, 1)).toBe('void');
  });

  it('age resets on change and grows otherwise', () => {
    const s = makeState([], { grimoire: ['germination'] });
    put(s, 3, 1, 's');
    put(s, ...nb(3, 1, 'E'), 'W');
    s.grid[toIndex(0, 0)]!.age = 5;
    const r = step(s);
    expect(at(r, 3, 1).age).toBe(0);
    expect(at(r, 3, 1).lastLawId).toBe('germination');
    expect(at(r, 0, 0).age).toBe(6);
    expect(at(step(r), 3, 1).age).toBe(1);
  });

  it('Ruissellement: only a strictly higher water neighbor floods', () => {
    const s = makeState([], { grimoire: ['ruissellement'] });
    // Case 1: higher water next to the void → floods.
    put(s, 2, 1, '.', 1);
    put(s, ...nb(2, 1, 'E'), 'W', 2);
    // Case 2: same altitude → no flow.
    put(s, 2, 3, '.', 1);
    put(s, ...nb(2, 3, 'E'), 'W', 1);
    // Case 3: lower water → no flow uphill.
    put(s, 2, 5, '.', 1);
    put(s, ...nb(2, 5, 'E'), 'W', 0);
    // Case 4: higher water but 2 steps away → no flow.
    put(s, 8, 7, '.', 1);
    put(s, ...nb(...nb(8, 7, 'E'), 'E'), 'W', 2);
    const r = step(s);
    expect(el(r, 2, 1)).toBe('water');
    expect(at(r, 2, 1).lastLawId).toBe('ruissellement');
    expect(el(r, 2, 3)).toBe('void');
    expect(el(r, 2, 5)).toBe('void');
    expect(el(r, 8, 7)).toBe('void');
  });

  it('events act before cells and shield their targets for that cycle', () => {
    // Foudre at cycle 5 turns the forest into fire; it must still be fire (not ash) after the cycle.
    const s = makeState(['', '...F'], { grimoire: ['foudre'], cycle: 4 });
    const r = step(s);
    expect(el(r, 3, 1)).toBe('fire');
    expect(at(r, 3, 1).age).toBe(0);
    expect(el(step(r), 3, 1)).toBe('ash');
  });
});

describe('law thresholds (6 neighbors)', () => {
  // [law, center element, neighbor element, threshold, result]
  const cases: [string, string, string, number, string][] = [
    ['croissance', 'p', 'p', 3, 'forest'],
    ['dissemination', '.', 'F', 2, 'seed'],
    ['pollen', '.', 'p', 3, 'seed'],
    ['erosion', 'R', 'W', 3, 'void'],
    ['mangrove', 'W', 'F', 3, 'forest'],
  ];
  const C: [number, number] = [5, 4];
  for (const [law, center, neighbor, threshold, result] of cases) {
    it(`${law}: needs ${threshold} neighbors`, () => {
      const build = (n: number) => {
        const s = makeState([], { grimoire: [law] });
        put(s, ...C, center);
        DIRS.slice(0, n).forEach((d) => put(s, ...nb(...C, d), neighbor));
        return s;
      };
      expect(el(step(build(threshold - 1)), ...C)).not.toBe(result);
      expect(el(step(build(threshold)), ...C)).toBe(result);
    });
  }
  it('Vent d’ouest looks at the O neighbor only', () => {
    const west = makeState([], { grimoire: ['vent-ouest'] });
    put(west, ...nb(...C, 'O'), 'p');
    const east = makeState([], { grimoire: ['vent-ouest'] });
    put(east, ...nb(...C, 'E'), 'p');
    expect(el(step(west), ...C)).toBe('seed');
    expect(el(step(east), ...C)).toBe('void');
  });
  it('Racines humides needs one water neighbor', () => {
    const s = makeState([], { grimoire: ['racines-humides'] });
    put(s, ...C, 'p');
    put(s, ...nb(...C, 'SE'), 'W');
    put(s, ...nb(...C, 'NO'), '*');
    expect(el(step(s), ...C)).toBe('plant');
  });
});

describe('compound conditions', () => {
  const C: [number, number] = [5, 4];
  const R1 = [
    {
      type: 'anyOf' as const,
      options: [
        [{ type: 'neighbors' as const, element: 'vegetal' as const, min: 3 }],
        [
          { type: 'neighbors' as const, element: 'vegetal' as const, min: 2 },
          { type: 'neighbors' as const, element: 'water' as const, min: 1 },
        ],
      ],
    },
  ];
  const withRule = (conditions: unknown[]) => {
    LAW_BY_ID['test-rule'] = {
      id: 'test-rule', icon: '🧪', name: 'T', description: 't', kind: 'transform', rarity: 'common',
      rule: { target: 'plant', conditions: conditions as never, result: 'forest' },
    };
    return makeState([], { grimoire: ['test-rule'] });
  };
  const run = (s: GameState) => {
    const r = step(s);
    delete LAW_BY_ID['test-rule'];
    return el(r, ...C);
  };

  it('anyOf: first branch (3 vegetal)', () => {
    const s = withRule(R1);
    put(s, ...C, 'p');
    for (const d of DIRS.slice(0, 3)) put(s, ...nb(...C, d), 'p');
    expect(run(s)).toBe('forest');
  });
  it('anyOf: second branch (2 vegetal + water)', () => {
    const s = withRule(R1);
    put(s, ...C, 'p');
    for (const d of DIRS.slice(0, 2)) put(s, ...nb(...C, d), 'p');
    put(s, ...nb(...C, DIRS[2]!), 'W');
    expect(run(s)).toBe('forest');
  });
  it('anyOf: neither branch (2 vegetal, no water)', () => {
    const s = withRule(R1);
    put(s, ...C, 'p');
    for (const d of DIRS.slice(0, 2)) put(s, ...nb(...C, d), 'p');
    expect(run(s)).toBe('plant');
  });
  it('within: water two steps away counts, three steps away does not', () => {
    const rule = [
      { type: 'neighbors', element: 'vegetal', min: 2 },
      { type: 'within', element: 'water', distance: 2, min: 1 },
    ];
    const near = withRule(rule);
    put(near, ...C, 'p');
    for (const d of DIRS.slice(0, 2)) put(near, ...nb(...C, d), 'p');
    put(near, ...nb(...nb(...C, 'SE'), 'SE'), 'W'); // distance 2
    expect(run(near)).toBe('forest');
    const far = withRule(rule);
    put(far, ...C, 'p');
    for (const d of DIRS.slice(0, 2)) put(far, ...nb(...C, d), 'p');
    put(far, ...nb(...nb(...nb(...C, 'SE'), 'SE'), 'SE'), 'W'); // distance 3
    expect(run(far)).toBe('plant');
  });
});

describe('Foudre', () => {
  it('hits the highest forest', () => {
    const s = makeState(['F', '....F'], { grimoire: ['foudre'], cycle: 4, alts: ['1', '00002'] });
    const r = step(s);
    expect(el(r, 4, 1)).toBe('fire');
    expect(el(r, 0, 0)).toBe('forest');
  });
  it('breaks ties by row-major order', () => {
    const s = makeState(['', '..F', '', '......F'], {
      grimoire: ['foudre'],
      cycle: 4,
      alts: ['', '112', '', '111111' + '2'],
    });
    const r = step(s);
    expect(el(r, 2, 1)).toBe('fire');
    expect(el(r, 6, 3)).toBe('forest');
  });
  it('does nothing without forest', () => {
    const s = makeState(['..p'], { grimoire: ['foudre'], cycle: 4 });
    const { events } = stepCycle(s);
    expect(events.filter((e) => e.lawId === 'foudre')).toHaveLength(0);
  });
});

describe('event periodicity (global cycle number)', () => {
  it('Pluie des cimes fires on cycles 4 and 8 only', () => {
    let s = makeState([], { grimoire: ['pluie-cimes'] });
    for (const c of s.grid) c.altitude = 2;
    const fired: number[] = [];
    for (let i = 0; i < 8; i++) {
      const r = stepCycle(s);
      s = r.state;
      if (r.events.some((e) => e.lawId === 'pluie-cimes')) fired.push(s.cycle);
      // Reset the rain so each firing is observable.
      for (const c of s.grid) if (c.element === 'water') c.element = 'void';
    }
    expect(fired).toEqual([4, 8]);
  });
  it('uses the global cycle, not the cycle in the season', () => {
    const s = makeState([], { grimoire: ['pluie-cimes'], cycle: 3 });
    for (const c of s.grid) c.altitude = 2;
    expect(stepCycle(s).events.some((e) => e.lawId === 'pluie-cimes')).toBe(true);
  });
});

describe('essence and season end', () => {
  const finish = (s: GameState) => finishSeason(fullSeason(s));
  it('+1 per Plant, +2 per Forest', () => {
    // Isolated cells, no grimoire: nothing changes during the season.
    const s = makeState(['p.p.p', '', 'F...F'], { essence: 5 });
    const { summary, state } = finish(s);
    expect(summary.essenceFromPlants).toBe(3);
    expect(summary.essenceFromForests).toBe(4);
    expect(state.essence).toBe(5 + 7);
  });
  it('Offrande and Sources sacrées add season-end bonuses', () => {
    const s = makeState([], { grimoire: ['offrande', 'sources-sacrees'], essence: 0 });
    put(s, 1, 1, 'W');
    put(s, ...nb(1, 1, 'E'), 'F');
    put(s, 8, 6, 'F');
    const { summary } = finish(s);
    expect(summary.essenceFromLaws['offrande']).toBe(2);
    expect(summary.essenceFromLaws['sources-sacrees']).toBe(1);
    expect(summary.essenceGained).toBe(4 + 2 + 1);
  });
  it('Cycle des cendres gives +1 per Fire turned to Ash', () => {
    const s = makeState(['**'], { grimoire: ['cycle-cendres'], essence: 0 });
    const r = stepCycle(s);
    expect(r.essenceGained).toBe(2);
    expect(r.state.essence).toBe(2);
  });
  it('essence from natural fire burnout needs the law', () => {
    const r = stepCycle(makeState(['**'], { essence: 0 }));
    expect(r.essenceGained).toBe(0);
  });
});

describe('victory and defeat', () => {
  const plantsAndForests = (plants: number, forests: number) => {
    const s = makeState([], { phase: 'intervention' });
    s.grid.forEach((c, i) => {
      if (i < forests) c.element = 'forest';
      else if (i < forests + plants) c.element = 'plant';
    });
    return s;
  };
  it('wins immediately when the objective is met at season end', () => {
    const r = runSeason(plantsAndForests(0, 108));
    expect(r.state.phase).toBe('won');
    expect(r.summary.goalReached).toBe(true);
  });
  it('wins at exactly the goal', () => {
    const r = runSeason(plantsAndForests(GOAL.vegetal - GOAL.forests, GOAL.forests));
    expect(r.state.phase).toBe('won');
  });
  it('needs enough forests, not only plants', () => {
    // Plenty of vegetal but one Forest short (no grimoire, so plants stay plants).
    const r = runSeason(plantsAndForests(GOAL.vegetal, GOAL.forests - 1));
    expect(r.summary.vegetal).toBeGreaterThanOrEqual(GOAL.vegetal);
    expect(r.state.phase).toBe('intervention');
    expect(r.state.season).toBe(2);
    expect(r.state.draft).not.toBeNull();
  });
  it('needs enough vegetal, even with enough forests', () => {
    const r = runSeason(plantsAndForests(0, GOAL.vegetal - 1));
    expect(r.state.phase).toBe('intervention');
  });
  it('loses when the objective is missed after season 5', () => {
    const r = runSeason(makeState(['pF'], { phase: 'intervention', season: 5 }));
    expect(r.state.phase).toBe('lost');
    expect(r.state.lossReason).toBe('objective');
  });
  it('loses when the world is dead (no life, essence below the cheapest life miracle)', () => {
    const r = runSeason(makeState(['R'], { phase: 'intervention', essence: 1 }));
    expect(r.state.phase).toBe('lost');
    expect(r.state.lossReason).toBe('deadWorld');
  });
  it('is not dead with enough Essence to sow, or with a seed', () => {
    expect(runSeason(makeState(['R'], { phase: 'intervention', essence: 2 })).state.phase).toBe('intervention');
    const withSeed = runSeason(makeState(['Rs'], { phase: 'intervention', essence: 0 }));
    // Seed (age 0..7) withers during the season → dead at the end.
    expect(withSeed.state.lossReason).toBe('deadWorld');
  });
  it('launching requires the draft to be resolved', () => {
    expect(() => launchSeason(newGame(3))).toThrow();
  });
});

describe('journal', () => {
  it('records from/to/law and replays onto the grid', () => {
    const s = makeState([], { grimoire: ['germination'] });
    put(s, 3, 1, 's');
    put(s, ...nb(3, 1, 'E'), 'W');
    const { events } = stepCycle(s);
    expect(events).toEqual([{ index: toIndex(3, 1), from: 'seed', to: 'plant', lawId: 'germination' }]);
  });
  it('runSeason returns 8 cycle logs with global numbers', () => {
    const s = makeState([], { phase: 'intervention' });
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
    const g = makeState(['', '..Ws', '.pF.p'], {
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
    registerCustomCondition('only-first-column', (_grid, index) => index % GRID_COLS === 0);
    LAW_BY_ID['test-custom'] = {
      id: 'test-custom',
      icon: '🧪',
      name: 'Test',
      description: 'test',
      kind: 'transform',
      rarity: 'common',
      rule: { target: 'void', conditions: [{ type: 'custom', id: 'only-first-column' }], result: 'rock' },
    };
    const r = step(makeState([], { grimoire: ['test-custom'] }));
    expect(el(r, 0, 0)).toBe('rock');
    expect(el(r, 1, 0)).toBe('void');
    delete LAW_BY_ID['test-custom'];
  });
});

describe('world generation', () => {
  it('respects all constraints over many seeds', () => {
    for (let seed = 1; seed <= 300; seed++) {
      const { grid } = newGame(seed);
      expect(grid).toHaveLength(GRID_COLS * GRID_ROWS);
      // 3 altitude levels
      expect(new Set(grid.map((c) => c.altitude)).size).toBe(3);
      // lakes: connected components of low water, right count and sizes
      const water = grid.map((c, i) => (c.element === 'water' ? i : -1)).filter((i) => i >= 0);
      for (const w of water) expect(grid[w]!.altitude).toBe(0);
      const seen = new Set<number>();
      const sizes: number[] = [];
      for (const w of water) {
        if (seen.has(w)) continue;
        let size = 0;
        const queue = [w];
        seen.add(w);
        while (queue.length) {
          size++;
          for (const n of neighborsOf(queue.pop()!)) {
            if (grid[n]!.element === 'water' && !seen.has(n)) {
              seen.add(n);
              queue.push(n);
            }
          }
        }
        sizes.push(size);
      }
      expect(sizes).toHaveLength(GENERATION.lakes);
      for (const size of sizes) {
        expect(size).toBeGreaterThanOrEqual(GENERATION.lakeMin);
        expect(size).toBeLessThanOrEqual(GENERATION.lakeMax);
      }
      // rocks, seeds
      const rocks = countElement(grid, 'rock');
      expect(rocks).toBeGreaterThanOrEqual(GENERATION.rocksMin);
      expect(rocks).toBeLessThanOrEqual(GENERATION.rocksMax);
      expect(countElement(grid, 'seed')).toBe(GENERATION.seeds);
      const wet = grid.filter(
        (c, i) => c.element === 'seed' && neighborsOf(i).some((n) => grid[n]!.element === 'water'),
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
