import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CYCLES_PER_SEASON } from '../data/constants.ts';
import {
  castMiracle,
  countElement,
  countVegetal,
  miracleTargets,
  moveLaw,
  newGame,
  previewCycle,
  removeLaw,
  runSeason,
  starsFor,
  skipDraft,
  takeDraftLaw,
  undoAllMiracles,
  undoMiracle,
} from '../engine/index.ts';
import type { ElementId, GameState, SeasonResult } from '../engine/index.ts';
import { Board } from './Board.tsx';
import { DraftPanel } from './DraftPanel.tsx';
import { EndScreen } from './EndScreen.tsx';
import { Grimoire } from './Grimoire.tsx';
import { Header } from './Header.tsx';
import { Inspector } from './Inspector.tsx';
import { Overlay } from './Overlay.tsx';
import { VIEW_H, VIEW_W } from './hex.ts';
import { MiracleBar } from './MiracleBar.tsx';
import { NaturalLaws } from './NaturalLaws.tsx';
import { SeasonSummary } from './SeasonSummary.tsx';
import { loadBest, mergeBest, saveBest, starString } from './best.ts';
import { buildFrames } from './replay.ts';
import { loadSave, writeSave } from './save.ts';

const STEP_MS = 400;
const randomSeed = () => Math.floor(Math.random() * 2 ** 32);

export function App() {
  const saved = useMemo(() => loadSave(), []);
  const [game, setGame] = useState<GameState>(() => saved?.game ?? newGame(randomSeed()));
  const [lastRun, setLastRun] = useState<SeasonResult | null>(saved?.lastRun ?? null);
  const [pending, setPending] = useState<boolean>(saved?.pending ?? false);
  const [debug, setDebug] = useState<boolean>(saved?.debug ?? false);
  /** Frame of the last season currently shown (playback or history review); null = live state. */
  const [frame, setFrame] = useState<number | null>(saved?.pending ? CYCLES_PER_SEASON : null);
  const [playing, setPlaying] = useState(false);
  const [miracle, setMiracle] = useState<string | null>(null);
  const [previewOn, setPreviewOn] = useState(false);
  const [inspected, setInspected] = useState<number | null>(null);
  const [endDismissed, setEndDismissed] = useState(false);
  const [bests, setBests] = useState(loadBest);
  const [win, setWin] = useState<{ stars: number; best: number; newBest: boolean } | null>(null);
  const recorded = useRef<string | null>(null);
  /** Overlay temporarily hidden (to see the map and reach the debug history slider). */
  const [overlayHidden, setOverlayHidden] = useState(false);

  useEffect(() => writeSave({ game, lastRun, pending, debug }), [game, lastRun, pending, debug]);

  // Record the stars of a victory (once per game) once its season summary has been acknowledged.
  useEffect(() => {
    if (game.phase !== 'won' || pending) return;
    const key = `${game.seed}:${game.cycle}`;
    if (recorded.current === key) return;
    recorded.current = key;
    const stars = starsFor(game);
    const m = mergeBest(bests, game.seed, stars);
    if (m.isNew) {
      setBests(m.best);
      saveBest(m.best);
    }
    setWin({ stars, best: Math.max(stars, m.previous), newBest: m.isNew });
  }, [game, pending, bests]);

  const frames = useMemo(() => (lastRun ? buildFrames(lastRun.startGrid, lastRun.cycles) : []), [lastRun]);

  // Season playback timer.
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      setFrame((f) => {
        const next = (f ?? 0) + 1;
        if (next >= CYCLES_PER_SEASON) setPlaying(false);
        return Math.min(next, CYCLES_PER_SEASON);
      });
    }, STEP_MS);
    return () => clearInterval(t);
  }, [playing]);

  const viewing = frame !== null && frames[frame] !== undefined;
  const cells = viewing ? frames[frame!]! : game.grid;
  const inIntervention = game.phase === 'intervention' && !pending && !viewing;
  const canPickDraft = inIntervention && game.draft !== null;
  const canAct = inIntervention && game.draft === null;

  const targets = useMemo(
    () => new Set(canAct && miracle ? miracleTargets(game, miracle) : []),
    [game, miracle, canAct],
  );
  const preview = useMemo(() => {
    const map = new Map<number, ElementId>();
    if (canAct && previewOn) for (const e of previewCycle(game)) map.set(e.index, e.to);
    return map;
  }, [game, previewOn, canAct]);
  const flashes = useMemo(() => {
    const set = new Set<number>();
    if (viewing && frame! >= 1) for (const e of lastRun!.cycles[frame! - 1]?.events ?? []) set.add(e.index);
    return set;
  }, [viewing, frame, lastRun]);

  const shownSeason = pending && lastRun ? lastRun.summary.season : game.season;
  const shownEssence =
    pending && lastRun ? (frame! >= CYCLES_PER_SEASON ? lastRun.summary.essenceAfter : lastRun.summary.essenceBefore) : game.essence;

  // ---------- Handlers
  const edit = (fn: (g: GameState) => GameState) => {
    setGame((g) => fn(g));
    setMiracle(null);
  };

  const onTapCell = (i: number) => {
    if (canAct && miracle) {
      if (targets.has(i)) {
        setGame(castMiracle(game, miracle, i));
        setMiracle(null);
      } else {
        setMiracle(null);
      }
      return;
    }
    setInspected((cur) => (cur === i ? null : i));
  };

  const launch = () => {
    const run = runSeason(game);
    setLastRun(run);
    setGame(run.state);
    setPending(true);
    setMiracle(null);
    setPreviewOn(false);
    setInspected(null);
    setFrame(0);
    setPlaying(!debug);
  };

  const skipPlayback = () => {
    setPlaying(false);
    setFrame(CYCLES_PER_SEASON);
  };

  const acknowledge = () => {
    setPending(false);
    setFrame(null);
    setPlaying(false);
    setInspected(null);
  };

  const startNew = (seed: number) => {
    setGame(newGame(seed));
    setLastRun(null);
    setPending(false);
    setFrame(null);
    setPlaying(false);
    setMiracle(null);
    setPreviewOn(false);
    setInspected(null);
    setEndDismissed(false);
  };
  const confirmAbandon = () => game.phase !== 'intervention' || window.confirm('Abandonner la partie en cours ?');

  const playbackDone = pending && frame === CYCLES_PER_SEASON;
  const showHistorySlider = debug && lastRun !== null;
  const gameOver = game.phase === 'won' || game.phase === 'lost';
  const showEnd = !pending && !viewing && gameOver;
  const overlayKind = canPickDraft ? 'revelation' : showEnd && !endDismissed ? 'end' : null;

  useEffect(() => setOverlayHidden(false), [overlayKind]);

  return (
    <div class="layout">
      <div class="map">
        <div class="map-inner" style={{ '--ratio': VIEW_W / VIEW_H }}>
          <Board
            cells={cells}
            targets={targets}
            flashes={flashes}
            flashKey={frame ?? 0}
            preview={preview}
            selected={inspected}
            onTap={onTapCell}
          />
          {inspected !== null && cells[inspected] && (
            <Inspector index={inspected} cell={cells[inspected]!} onClose={() => setInspected(null)} />
          )}
        </div>
      </div>

      <aside class="side">
        {overlayKind && overlayHidden && (
          <button class="btn small overlay-restore" onClick={() => setOverlayHidden(false)}>
            👁 Afficher {overlayKind === 'revelation' ? 'la révélation' : 'le bilan'}
          </button>
        )}

        <Header
          season={shownSeason}
          essence={shownEssence}
          vegetal={countVegetal(cells)}
          forests={countElement(cells, 'forest')}
        />

        {viewing && (
          <div class="playback">
            {pending && playing && (
              <button class="btn small" onClick={skipPlayback}>
                Passer ⏭
              </button>
            )}
            <span class="hint">
              {frame === 0 ? 'Début de saison' : `Cycle ${frame}/${CYCLES_PER_SEASON}`}
              {!pending && ' (historique)'}
            </span>
            {!pending && (
              <button class="btn small ghost" onClick={() => setFrame(null)}>
                Retour au présent
              </button>
            )}
          </div>
        )}

        {showHistorySlider && (
          <div class="panel debug">
            <div class="row">
              <button
                class="icon"
                aria-label="Cycle précédent"
                disabled={(frame ?? CYCLES_PER_SEASON) <= 0}
                onClick={() => {
                  setPlaying(false);
                  setFrame(Math.max(0, (frame ?? CYCLES_PER_SEASON) - 1));
                }}
              >
                ◀
              </button>
              <input
                type="range"
                min={0}
                max={CYCLES_PER_SEASON}
                value={frame ?? CYCLES_PER_SEASON}
                aria-label="Historique de la dernière saison"
                onInput={(e) => {
                  setPlaying(false);
                  setFrame(Number((e.currentTarget as HTMLInputElement).value));
                }}
              />
              <button
                class="icon"
                aria-label="Cycle suivant"
                disabled={(frame ?? CYCLES_PER_SEASON) >= CYCLES_PER_SEASON}
                onClick={() => {
                  setPlaying(false);
                  setFrame(Math.min(CYCLES_PER_SEASON, (frame ?? CYCLES_PER_SEASON) + 1));
                }}
              >
                ▶
              </button>
            </div>
            <p class="hint">
              Debug — dernière saison :{' '}
              {(frame ?? CYCLES_PER_SEASON) === 0 ? 'début' : `cycle ${frame ?? CYCLES_PER_SEASON}`}
              {frame !== null && frame >= 1 && lastRun!.cycles[frame - 1] && (
                <> · {lastRun!.cycles[frame - 1]!.events.length} changement(s)</>
              )}
            </p>
            {frame !== null && frame >= 1 && (
              <ul class="plain log">
                {lastRun!.cycles[frame - 1]!.events.slice(0, 12).map((e, k) => (
                  <li key={k}>
                    #{e.index} {e.from} → {e.to} <small>({e.lawId})</small>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {playbackDone && lastRun && <SeasonSummary summary={lastRun.summary} final={gameOver} onContinue={acknowledge} />}

        {!pending && !viewing && gameOver && endDismissed && (
          <section class="panel">
            <h2>{game.phase === 'won' ? 'Victoire' : 'Défaite'}</h2>
            <button class="btn small" onClick={() => setEndDismissed(false)}>
              Revoir le bilan
            </button>
          </section>
        )}

        {game.phase === 'intervention' && !pending && (
          <>
            <Grimoire
              laws={game.grimoire}
              editable={canAct}
              onMove={(i, d) => edit((g) => moveLaw(g, i, d))}
              onRemove={(i) => edit((g) => removeLaw(g, i))}
            />
            <NaturalLaws />
            {canAct && (
              <MiracleBar
                essence={game.essence}
                selected={miracle}
                cast={game.miracles.length}
                onSelect={setMiracle}
                onUndo={() => edit(undoMiracle)}
                onUndoAll={() => edit(undoAllMiracles)}
              />
            )}
            {canAct && (
              <div class="actions">
                <button class={`btn ${previewOn ? 'active' : ''}`} onClick={() => setPreviewOn((p) => !p)}>
                  {previewOn ? 'Masquer l’aperçu' : 'Aperçu'}
                </button>
                <button class="btn primary" onClick={launch}>
                  Lancer la saison
                </button>
              </div>
            )}
          </>
        )}

        <footer class="footer">
          <span>
            Graine <code>{game.seed}</code>
            {bests[String(game.seed)] ? <> · {starString(bests[String(game.seed)]!)}</> : null}
          </span>
          <label class="switch">
            <input type="checkbox" checked={debug} onChange={(e) => setDebug((e.currentTarget as HTMLInputElement).checked)} />
            Debug
          </label>
          <button class="btn small ghost" onClick={() => confirmAbandon() && startNew(randomSeed())}>
            Nouvelle partie
          </button>
          <button class="btn small ghost" onClick={() => confirmAbandon() && startNew(game.seed)}>
            Rejouer la graine
          </button>
        </footer>
      </aside>

      {canPickDraft && !overlayHidden && (
        <Overlay onHide={() => setOverlayHidden(true)}>
          <DraftPanel
            offer={game.draft!}
            grimoire={game.grimoire}
            onTake={(id, at) => edit((g) => takeDraftLaw(g, id, at))}
            onSkip={() => edit(skipDraft)}
          />
        </Overlay>
      )}

      {showEnd && !endDismissed && !overlayHidden && (
        <Overlay onHide={() => setOverlayHidden(true)}>
          <EndScreen
            game={game}
            onNew={() => startNew(randomSeed())}
            onReplay={() => startNew(game.seed)}
            onClose={() => setEndDismissed(true)}
            stars={win?.stars ?? starsFor(game)}
            best={win?.best ?? 0}
            newBest={win?.newBest ?? false}
          />
        </Overlay>
      )}
    </div>
  );
}
