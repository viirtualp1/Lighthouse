import { reactive, ref, shallowRef, triggerRef } from 'vue';
import { playEffects, updateAmbience } from '@/audio/sound';
import { GAME, RESTORATION } from '@/game/config';
import { computeLight } from '@/game/light';
import * as sim from '@/game/sim';
import { createState } from '@/game/state';
import type { BeamMode, BuildingId } from '@/game/config';
import type { Point } from '@/game/map';
import type { Effect, Message } from '@/game/state';
import type { MapTarget, ViewState } from '@/render/GameRenderer';

export interface Banner {
  id: number;
  title: Message;
  subtitle: Message;
}

const UI_REFRESH_SECONDS = 0.1;
const BEAM_STEP = Math.PI / 18;
const SHADOW_NEAR = 0.7;
const MENU_DREAD = 0.2;

const state = shallowRef(createState());
const view = reactive<ViewState>({ hoverSlot: null, pointer: null, selectedId: null, placing: null, aiming: false, highlight: null, previewStage: false, selectedFind: null, cinematic: true });
const screenPointer = ref<Point | null>(null);
const hoverTarget = shallowRef<MapTarget | null>(null);
/** The journal page just read, shown until the player closes it. */
const journalPage = ref<number | null>(null);
const banner = ref<Banner | null>(null);
const menuOpen = ref(false);
/** The title screen shows first; the town waits behind it, paused, as a night backdrop. */
const screen = ref<'menu' | 'game'>('menu');
/** Whether a game has been started this visit, so the title screen can offer to continue it. */
const hasGame = ref(false);
/** Set by the map once it is drawn; lets HUD overlays point at things on the map. */
const projector = shallowRef<((point: Point) => { x: number; y: number; scale: number }) | null>(null);
const restartListeners: (() => void)[] = [];
let sinceRefresh = 0;
let bannerId = 0;
let speedBeforeMenu = 1;

function refresh () {
  sinceRefresh = 0;
  triggerRef(state);
}

function show (title: Message, subtitle: Message) {
  banner.value = { id: ++bannerId, title, subtitle };
}

function showBanner (effects: Effect[]) {
  const s = state.value;

  for (const effect of effects) {
    if (effect.kind === 'dusk' && s.day === GAME.daysToWin) {
      const lit = s.restoration.stage >= RESTORATION.length;
      show({ key: 'banner.finalTitle', params: {} }, { key: lit ? 'banner.finalLit' : 'banner.finalDark', params: {} });
    } else if (effect.kind === 'dusk') {
      show({ key: 'banner.duskTitle', params: {} }, { key: 'banner.duskText', params: { day: s.day, h: sim.nightHours(s) } });
    } else if (effect.kind === 'night') {
      show({ key: 'banner.nightTitle', params: { day: s.day } }, { key: 'banner.nightText', params: {} });
    } else if (effect.kind === 'oilOut') {
      show({ key: 'banner.oilOutTitle', params: {} }, { key: 'banner.oilOutText', params: {} });
    }
  }
}

/** How much of the town the Shadow is pressing on, for the whispering in the soundscape. */
function dread () {
  const s = state.value;
  const near = s.buildings.filter(b => sim.shadowAt(s, b.slot) >= SHADOW_NEAR).length;

  return Math.min(1, near / 4 + (s.resources.oil <= 0 ? 0.5 : 0));
}

function frame (seconds: number) {
  const s = state.value;
  const playing = screen.value === 'game';

  if (playing && s.speed > 0 && s.status === 'playing' && !s.dawnReport) {
    sim.advance(s, (seconds / GAME.secondsPerHour) * s.speed);
  }

  const effects = s.effects.splice(0);

  if (effects.length) {
    playEffects(effects);
    showBanner(effects);
  }

  updateAmbience(playing ? sim.nightness(s) : 1, playing ? dread() : MENU_DREAD);
  sinceRefresh += seconds;

  if (sinceRefresh >= UI_REFRESH_SECONDS || effects.length) {
    refresh();
  }

  return effects;
}

function hover (target: MapTarget | null, point: Point | null, screen: Point | null) {
  view.hoverSlot = target?.slot ?? null;
  view.pointer = point;
  hoverTarget.value = target;
  screenPointer.value = screen;
}

function press (target: MapTarget, point: Point) {
  const slot = target.slot;
  const s = state.value;

  if (screen.value !== 'game') {
    return;
  }

  if (view.aiming) {
    const { x, y } = s.map.lighthouse;
    sim.setBeamAngle(s, Math.atan2(point.y - y, point.x - x));
    view.aiming = false;
    refresh();

    return;
  }

  if (view.placing) {
    const built = slot === null ? null : sim.build(s, view.placing, slot);

    if (built) {
      view.selectedId = built.id;

      if (!sim.canAfford(s, view.placing)) {
        view.placing = null;
      }
    }

    refresh();

    return;
  }

  if (target.find !== null) {
    selectFind(target.find);
  } else if (target.lighthouse) {
    selectLighthouse();
  } else {
    select(slot === null ? null : s.buildings.find(b => b.slot === slot)?.id ?? null);
  }
}

function cancel () {
  view.placing = null;
  view.aiming = false;
}

function select (id: number | null) {
  view.placing = null;
  view.aiming = false;
  view.selectedFind = null;
  view.selectedId = id;
}

/** Opens the Lighthouse's own card: where the restoration is run from. */
function selectLighthouse () {
  select(state.value.buildings.find(b => b.type === 'lighthouse')?.id ?? null);
}

function selectFind (id: number | null) {
  select(null);
  view.selectedFind = id;
}

function startPlacing (type: BuildingId) {
  view.aiming = false;
  view.selectedId = null;
  view.placing = view.placing === type ? null : type;
}

function startAiming () {
  view.placing = null;
  view.aiming = !view.aiming;

  if (state.value.mode !== 'beam') {
    sim.setMode(state.value, 'beam');
    refresh();
  }
}

function rotateBeam (direction: number) {
  sim.setBeamAngle(state.value, state.value.beamAngle + direction * BEAM_STEP);
  refresh();
}

function setMode (mode: BeamMode) {
  sim.setMode(state.value, mode);
  refresh();
}

function setWorkers (id: number, workers: number) {
  sim.setWorkers(state.value, id, workers);
  refresh();
}

function demolish (id: number) {
  sim.demolish(state.value, id);
  view.selectedId = null;
  refresh();
}

function startStage () {
  sim.startStage(state.value);
  view.previewStage = false;
  refresh();
}

function setBuilders (builders: number) {
  sim.setBuilders(state.value, builders);
  refresh();
}

function collectFind (id: number) {
  const s = state.value;
  const journal = s.finds.find(f => f.id === id)?.kind === 'journal';
  sim.collectFind(s, id);
  view.selectedFind = null;
  journalPage.value = journal ? s.journalsRead : null;
  refresh();
}

function closeJournal () {
  journalPage.value = null;
}

function setSpeed (speed: number) {
  state.value.speed = speed;
  refresh();
}

function togglePause () {
  setSpeed(state.value.speed === 0 ? 1 : 0);
}

function closeDawnReport () {
  const s = state.value;
  sim.closeDawnReport(s);
  show({ key: 'banner.dayTitle', params: { day: Math.min(s.day, GAME.daysToWin) } }, { key: 'banner.dayText', params: { n: GAME.daysToWin - s.day + 1 } });
  refresh();
}

function openMenu () {
  if (menuOpen.value) {
    return;
  }

  speedBeforeMenu = state.value.speed;
  menuOpen.value = true;
  cancel();
  setSpeed(0);
}

function closeMenu () {
  if (!menuOpen.value) {
    return;
  }

  menuOpen.value = false;
  setSpeed(speedBeforeMenu);
}

/** Esc backs out one level at a time: a placement or aim first, then a selection, and only then the menu. */
function escape () {
  if (screen.value !== 'game') {
    return;
  }

  if (menuOpen.value) {
    closeMenu();
  } else if (view.placing || view.aiming) {
    cancel();
  } else if (journalPage.value !== null) {
    closeJournal();
  } else if (view.selectedId !== null || view.selectedFind !== null) {
    select(null);
  } else {
    openMenu();
  }
}

function restart () {
  state.value = createState();
  computeLight(state.value);
  menuOpen.value = false;
  view.selectedId = null;
  banner.value = null;
  cancel();
  restartListeners.forEach(listener => listener());
}

function newGame () {
  restart();
  hasGame.value = true;
  screen.value = 'game';
  view.cinematic = false;
  setSpeed(1);
}

function continueGame () {
  screen.value = 'game';
  view.cinematic = false;
  menuOpen.value = false;
  setSpeed(speedBeforeMenu);
}

function toMainMenu () {
  if (!menuOpen.value) {
    speedBeforeMenu = state.value.speed;
  }

  menuOpen.value = false;
  cancel();
  view.selectedId = null;
  screen.value = 'menu';
  view.cinematic = true;
  setSpeed(0);
}

function onRestart (listener: () => void) {
  restartListeners.push(listener);
}

export function useGame () {
  return {
    state,
    view,
    screenPointer,
    banner,
    menuOpen,
    screen,
    hasGame,
    newGame,
    continueGame,
    toMainMenu,
    projector,
    openMenu,
    closeMenu,
    escape,
    frame,
    hover,
    press,
    cancel,
    select,
    startPlacing,
    startAiming,
    rotateBeam,
    setMode,
    setWorkers,
    demolish,
    startStage,
    setBuilders,
    collectFind,
    selectFind,
    selectLighthouse,
    hoverTarget,
    journalPage,
    closeJournal,
    setSpeed,
    togglePause,
    closeDawnReport,
    restart,
    onRestart,
    refresh
  };
}

computeLight(state.value);
state.value.speed = 0;
