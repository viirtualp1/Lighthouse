import { GAME, START_RESOURCES } from './config';
import { createMap } from './map';
import { createRng } from './rng';
import type { BeamMode, BuildingId, ResourceId } from './config';
import type { GameMap, Point } from './map';
import type { Rng } from './rng';

export type Phase = 'day' | 'dusk' | 'night';

export type Status = 'playing' | 'won' | 'lost';

export interface Building extends Point {
  id: number;
  type: BuildingId;
  /** Index of the map slot it stands on; -1 for the Lighthouse in the centre. */
  slot: number;
  workers: number;
  progress: number;
}

/** Text the game produces, kept as a translation key so it follows the chosen language. */
export interface Message {
  key: string;
  params: Record<string, string | number>;
}

export interface LogEntry extends Message {
  id: number;
  day: number;
  clock: string;
  tone: 'info' | 'warn' | 'bad' | 'good';
  at: number;
}

export type EffectKind = 'build' | 'demolish' | 'vanish' | 'dusk' | 'night' | 'dawn' | 'oilOut' | 'assign';

/** Something that just happened in the world, for sound and particles to pick up and clear each frame. */
export interface Effect {
  kind: EffectKind;
  x?: number;
  y?: number;
}

export interface DawnReport {
  day: number;
  eaten: number;
  hungry: number;
  gotSick: number;
  died: number;
  recovered: number;
  vanished: number;
  deserted: number;
}

export interface GameState {
  rng: Rng;
  map: GameMap;
  buildings: Building[];
  resources: Record<ResourceId, number>;
  healthy: number;
  sick: number;
  day: number;
  hour: number;
  /** Game hours since the start, for fading log entries and other timing. */
  elapsed: number;
  phase: Phase;
  fear: number;
  mode: BeamMode;
  beamAngle: number;
  lens: boolean;
  /** Light level and Shadow cover per map slot, indexed like `map.slots`. */
  light: Uint8Array;
  shadow: Float32Array;
  shadowFront: number;
  oilOutWarned: boolean;
  vanishedTonight: number;
  status: Status;
  endReason: Message | null;
  dawnReport: DawnReport | null;
  pendingReport: DawnReport | null;
  effects: Effect[];
  log: LogEntry[];
  speed: number;
  revision: number;
  nextId: number;
}

export function createState (seed = Date.now()): GameState {
  const map = createMap(seed);

  const state: GameState = {
    rng: createRng(seed ^ 0x5eed),
    map,
    buildings: [],
    resources: { ...START_RESOURCES },
    healthy: GAME.startPopulation,
    sick: 0,
    day: 1,
    hour: 0,
    elapsed: 0,
    phase: 'day',
    fear: 10,
    mode: 'circle',
    beamAngle: Math.PI / 2,
    lens: false,
    light: new Uint8Array(map.slots.length),
    shadow: new Float32Array(map.slots.length),
    shadowFront: 0,
    oilOutWarned: false,
    vanishedTonight: 0,
    status: 'playing',
    endReason: null,
    dawnReport: null,
    pendingReport: null,
    effects: [],
    log: [],
    speed: 1,
    revision: 0,
    nextId: 1
  };

  state.buildings.push({ id: state.nextId++, type: 'lighthouse', slot: -1, ...map.lighthouse, workers: 2, progress: 0 });

  const inner = map.slots.filter(s => s.ring === 1);

  for (const i of [0, 2, 4, 6]) {
    const slot = inner[Math.floor((i / 8) * inner.length)];

    if (slot) {
      addBuilding(state, 'hut', slot.id, 0);
    }
  }

  const shore = map.slots
    .filter(s => s.kind === 'ring' && s.shore)
    .sort((a, b) => a.ring - b.ring || Math.abs(a.x - map.lighthouse.x) - Math.abs(b.x - map.lighthouse.x));

  if (shore[0]) {
    addBuilding(state, 'dock', shore[0].id, 3);
  }

  if (shore[1]) {
    addBuilding(state, 'driftwood', shore[1].id, 3);
  }

  return state;
}

export function addBuilding (state: GameState, type: BuildingId, slotId: number, workers: number) {
  const slot = state.map.slots[slotId]!;
  const building: Building = { id: state.nextId++, type, slot: slotId, x: slot.x, y: slot.y, workers, progress: 0 };
  state.buildings.push(building);
  state.revision++;

  return building;
}
