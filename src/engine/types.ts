// Shared types for the engine and data layers. Types only: no runtime code here.

export type ElementId = 'void' | 'rock' | 'water' | 'seed' | 'plant' | 'forest' | 'fire' | 'ash';
export type Altitude = 0 | 1 | 2;

/** An element, a list of elements, or the pseudo-selectors 'vegetal' (plant|forest) and 'any'. */
export type ElementSel = ElementId | 'vegetal' | 'any' | ElementId[];

/** The 6 hex directions: E, O (ouest), NE, NO, SE, SO. All 6 neighbors are equivalent. */
export type Dir = 'E' | 'O' | 'NE' | 'NO' | 'SE' | 'SO';

// ---------- Conditions (all evaluated against the snapshot, from the point of view of one cell)

export type Condition =
  | {
      type: 'neighbors';
      element: ElementSel;
      min?: number;
      max?: number;
      /** Only count neighbors strictly higher / lower / at the same altitude as the cell. */
      relativeAltitude?: 'higher' | 'lower' | 'same';
    }
  | { type: 'direction'; dir: Dir; element: ElementSel }
  /** Count cells (self excluded) within hex distance ≤ `distance`, not only direct neighbors. */
  | { type: 'within'; element: ElementSel; distance: number; min?: number; max?: number }
  /** OR of AND-lists: true if every condition of at least one option holds. */
  | { type: 'anyOf'; options: Condition[][] }
  | { type: 'minAge'; value: number }
  | { type: 'altitude'; min?: Altitude; max?: Altitude }
  | { type: 'custom'; id: string };

export interface CellRule {
  target: ElementSel;
  conditions: Condition[];
}

export interface TransformRule extends CellRule {
  result: ElementId;
}

// ---------- Laws

export type Rarity = 'common' | 'uncommon' | 'rare';

interface LawBase {
  id: string;
  /** Emoji shown next to the law name. */
  icon: string;
  name: string;
  /** One-line description shown in the UI. */
  description: string;
}

export interface TransformLaw extends LawBase {
  kind: 'transform';
  rarity: Rarity;
  rule: TransformRule;
}

export interface ProtectionLaw extends LawBase {
  kind: 'protection';
  rarity: Rarity;
  rule: CellRule;
}

export type EventEffect =
  | ({ type: 'cells' } & TransformRule)
  /** Change a single cell chosen among the matches: the highest one, ties broken by index order. */
  | ({ type: 'pickHighest' } & TransformRule)
  | { type: 'custom'; id: string };

export interface EventLaw extends LawBase {
  kind: 'event';
  rarity: Rarity;
  /** Fires when (global cycle number) % period === 0. */
  period: number;
  effect: EventEffect;
}

export type EssenceTrigger =
  /** At season end: +amount for each cell matching the rule. */
  | ({ type: 'seasonEnd'; amount: number } & CellRule)
  /** +amount each time a cell goes from `from` to `to` during a cycle. */
  | { type: 'onChange'; from: ElementSel; to: ElementSel; amount: number };

export interface EssenceLaw extends LawBase {
  kind: 'essence';
  rarity: Rarity;
  trigger: EssenceTrigger;
}

export type Law = TransformLaw | ProtectionLaw | EventLaw | EssenceLaw;

/** Always-on laws, outside the grimoire. */
export interface NaturalLaw extends LawBase {
  category: 'catastrophe' | 'wear';
  rule: TransformRule;
}

// ---------- Miracles

export type MiracleEffect =
  | { type: 'setElement'; element: ElementId }
  | { type: 'raise' };

export interface MiracleDef {
  id: string;
  name: string;
  description: string;
  cost: number;
  /** Cells the miracle may target. */
  target: ElementSel;
  effect: MiracleEffect;
  /** Counts as a way to bring life back (used by the dead-world rule). */
  createsLife: boolean;
}

// ---------- State

export interface Cell {
  element: ElementId;
  altitude: Altitude;
  age: number;
  lastLawId: string | null;
}

export type Phase = 'intervention' | 'running' | 'won' | 'lost';
export type LossReason = 'objective' | 'deadWorld';

export interface MiracleRecord {
  miracleId: string;
  index: number;
  before: Cell;
  cost: number;
}

export interface SeasonSummary {
  season: number;
  essenceBefore: number;
  essenceAfter: number;
  /** Essence earned during the cycles (onChange laws). */
  essenceFromCycles: number;
  essenceFromPlants: number;
  essenceFromForests: number;
  /** Essence from seasonEnd laws, per law id. */
  essenceFromLaws: Record<string, number>;
  essenceGained: number;
  changesByLaw: Record<string, number>;
  vegetal: number;
  forests: number;
  goalReached: boolean;
}

export interface GameState {
  version: 1;
  /** Initial seed, kept for "replay this seed". */
  seed: number;
  /** Current mulberry32 state. */
  rng: number;
  phase: Phase;
  lossReason: LossReason | null;
  /** Current season, 1-based. */
  season: number;
  /** Cycles completed since the start of the game. */
  cycle: number;
  cycleInSeason: number;
  essence: number;
  grid: Cell[];
  /** Ordered law ids. */
  grimoire: string[];
  /** Pending draft offer, or null once taken / skipped. */
  draft: string[] | null;
  /** Miracles cast during the current intervention (for undo). */
  miracles: MiracleRecord[];
  /** Summary of each finished season. */
  history: SeasonSummary[];
  /** Journal of the season being run (internal accumulator). */
  seasonChanges: Record<string, number>;
  seasonEssence: number;
  seasonStartEssence: number;
}

// ---------- Journal

export interface ChangeEvent {
  index: number;
  from: ElementId;
  to: ElementId;
  lawId: string;
}

export interface CycleLog {
  /** Global cycle number (1-based). */
  cycle: number;
  events: ChangeEvent[];
  essenceGained: number;
}
