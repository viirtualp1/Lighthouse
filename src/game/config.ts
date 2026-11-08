export type ResourceId = 'oil' | 'fish' | 'wood' | 'iron';

export type BuildingId =
  | 'lighthouse'
  | 'hut'
  | 'dock'
  | 'renderer'
  | 'oilCollector'
  | 'driftwood'
  | 'salvage'
  | 'infirmary'
  | 'chapel'
  | 'lantern';

export type Placement = 'land' | 'shore' | 'oil' | 'wreck' | 'fixed';

export type BeamMode = 'circle' | 'beam' | 'boost' | 'off';

export interface BuildingDef {
  id: BuildingId;
  cost: Partial<Record<ResourceId, number>>;
  maxWorkers: number;
  placement: Placement;
  housing?: number;
  limit?: number;
}

export interface BeamDef {
  oilPerHour: number;
}

/** One step of the city's ring grid in world pixels; light, Shadow and distances are measured in these. */
export const UNIT = 62;

export const WORLD = {
  width: 1600,
  height: 1100
};

export const GAME = {
  daysToWin: 20,
  minPopulation: 10,
  startPopulation: 30,
  secondsPerHour: 2,
  duskHours: 1,
  /** The night's report waits until the Shadow has drawn back, so "dawn" is something the player can see. */
  dawnHours: 1,
  dayStartClock: 6,
  shadowSpeed: 3,
  shadowRetreatSpeed: 12,
  shadowFillPerHour: 1.5,
  vanishChancePerHour: 0.04,
  fearPerDarkTenth: 1,
  fearPerDimTenth: 0.5,
  fearLighthouseOff: 10,
  fearDayDecay: 3,
  fearChapel: 1,
  fearStrikeAt: 50,
  fearDesertAt: 75,
  fearLoseAt: 100,
  hungrySickChance: 0.5,
  hungrySickDeathChance: 0.3,
  naturalRecovery: 0.1,
  healHoursPerPatient: 6,
  wreckIron: 100,
  maxBuilders: 6,
  /** On the last night, without the Great Light, the Shadow presses the Lighthouse's light back to this share. */
  finaleReach: 0.35,
  /** Hours a find must stay in the light at night before the town notices it. */
  findExposureHours: 0.5,
  beamArc: Math.PI / 3,
  lanternOilPerHour: 0.2,
  keeperlessReach: 0.6
};

/** Light reach in UNITs: full light inside `lit`, fading to darkness at `dim`. */
export const LIGHT = {
  circle: { lit: 3.6, dim: 5 },
  boost: { lit: 5.6, dim: 7 },
  beam: { lit: 1.6, dim: 3, length: 12 },
  lantern: { lit: 1.1, dim: 1.8 },
  litAbove: 0.65,
  dimAbove: 0.12
};

/** Night length in hours for each of the 20 days, matching the curve in the design doc. */
export const NIGHT_HOURS = [6, 6, 7, 7, 8, 8, 9, 9, 10, 12, 12, 13, 13, 14, 14, 15, 16, 17, 18, 20];

export const START_RESOURCES: Record<ResourceId, number> = {
  oil: 60,
  fish: 40,
  wood: 50,
  iron: 20
};

export const RESOURCE_IDS: ResourceId[] = ['oil', 'fish', 'wood', 'iron'];

export type StageId = 'tower' | 'lens' | 'lantern' | 'greatLight';

export interface RestorationStage {
  id: StageId;
  cost: Partial<Record<ResourceId, number>>;
  /** Worker-hours of building once the materials are delivered. */
  work: number;
  /** How many rings further every light mode reaches once this stage is done. */
  rings: number;
  /** Share of the beam's oil the stage saves from then on. */
  oilSaving?: number;
}

/**
 * The town's long goal: the Lighthouse starts half ruined and is restored stage by stage. Each stage pushes the light
 * further out; the last one, the Great Light, is what holds the Longest Night.
 */
export const RESTORATION: RestorationStage[] = [
  { id: 'tower', cost: { wood: 40, iron: 5 }, work: 24, rings: 0.5 },
  { id: 'lens', cost: { iron: 30 }, work: 30, rings: 1 },
  { id: 'lantern', cost: { wood: 60, iron: 25 }, work: 48, rings: 0.5, oilSaving: 0.25 },
  { id: 'greatLight', cost: { iron: 40, oil: 60 }, work: 72, rings: 1.5 }
];

export type FindKind = 'oil' | 'supplies' | 'survivors' | 'wreck' | 'journal';

/** What lies out in the dark, waiting for the light to reach it. */
export const FINDS: { kind: FindKind; reward: Partial<Record<ResourceId, number>>; people?: number }[] = [
  { kind: 'oil', reward: { oil: 45 } },
  { kind: 'oil', reward: { oil: 35 } },
  { kind: 'supplies', reward: { wood: 40, iron: 15 } },
  { kind: 'supplies', reward: { wood: 30, iron: 20 } },
  { kind: 'survivors', reward: {}, people: 4 },
  { kind: 'wreck', reward: {} },
  { kind: 'journal', reward: {} },
  { kind: 'journal', reward: {} },
  { kind: 'journal', reward: {} }
];

export const JOURNAL_FEAR_RELIEF = 8;

export const BEAM_MODES: Record<BeamMode, BeamDef> = {
  circle: { oilPerHour: 2 },
  beam: { oilPerHour: 2 },
  boost: { oilPerHour: 5 },
  off: { oilPerHour: 0 }
};

export const BUILDINGS: Record<BuildingId, BuildingDef> = {
  lighthouse: {
    id: 'lighthouse',
    cost: {},
    maxWorkers: 2,
    placement: 'fixed'
  },
  hut: {
    id: 'hut',
    cost: { wood: 15 },
    maxWorkers: 0,
    placement: 'land',
    housing: 5
  },
  dock: {
    id: 'dock',
    cost: { wood: 20 },
    maxWorkers: 5,
    placement: 'shore'
  },
  renderer: {
    id: 'renderer',
    cost: { wood: 25, iron: 10 },
    maxWorkers: 4,
    placement: 'land'
  },
  oilCollector: {
    id: 'oilCollector',
    cost: { wood: 15, iron: 5 },
    maxWorkers: 3,
    placement: 'oil'
  },
  driftwood: {
    id: 'driftwood',
    cost: { wood: 10 },
    maxWorkers: 5,
    placement: 'shore'
  },
  salvage: {
    id: 'salvage',
    cost: { wood: 10 },
    maxWorkers: 5,
    placement: 'wreck'
  },
  infirmary: {
    id: 'infirmary',
    cost: { wood: 30, iron: 10 },
    maxWorkers: 2,
    placement: 'land'
  },
  chapel: {
    id: 'chapel',
    cost: { wood: 20 },
    maxWorkers: 1,
    placement: 'land',
    limit: 1
  },
  lantern: {
    id: 'lantern',
    cost: { wood: 5, iron: 2 },
    maxWorkers: 0,
    placement: 'land'
  }
};

export type BuildGroupId = 'home' | 'food' | 'materials' | 'care';

/** The build bar's sections: grouped by what a building is for, so the player looks in one place per need. */
export const BUILD_GROUPS: { id: BuildGroupId; items: BuildingId[] }[] = [
  { id: 'home', items: ['hut'] },
  { id: 'food', items: ['dock', 'renderer', 'oilCollector'] },
  { id: 'materials', items: ['driftwood', 'salvage'] },
  { id: 'care', items: ['lantern', 'infirmary', 'chapel'] }
];
