import { GAME, UNIT, WORLD } from './config';
import { createRng } from './rng';

export type SlotKind = 'ring' | 'oil' | 'wreck';

export interface Point {
  x: number;
  y: number;
}

export interface Slot extends Point {
  id: number;
  ring: number;
  kind: SlotKind;
  shore: boolean;
  wreckIron: number;
  /** Distance to the map's edge in UNITs: the Shadow creeps in along this. */
  edgeDistance: number;
}

export interface Rock extends Point {
  r: number;
  seed: number;
}

export interface GameMap {
  width: number;
  height: number;
  lighthouse: Point;
  /** Coast height sampled every COAST_STEP pixels from the left edge; below it is the sea. */
  coast: number[];
  slots: Slot[];
  rocks: Rock[];
  /** The deepest any slot sits from the edge: once the Shadow's front passes it, it has nowhere further to go. */
  maxEdge: number;
}

export const COAST_STEP = 20;
export const RINGS = 7;
export const SLOT_RADIUS = 26;

const LIGHTHOUSE = { x: 800, y: 470 };
const RING_START = 30;
const SLOT_SPACING = 70;
const SITE_CLEARANCE = 70;
const SHORE_REACH = 70;

const OIL_SITES: Point[] = [
  { x: 170, y: 170 },
  { x: 1440, y: 210 },
  { x: 120, y: 560 }
];

const INLAND_WRECK: Point = { x: 1170, y: 110 };
const SHORE_WRECK_X = [230, 1380];

export function ringRadius (ring: number) {
  return RING_START + ring * UNIT;
}

export function coastAt (map: Pick<GameMap, 'coast'>, x: number) {
  const f = Math.max(0, x) / COAST_STEP;
  const i = Math.min(Math.floor(f), map.coast.length - 2);
  const t = f - i;

  return (map.coast[i] ?? 0) * (1 - t) + (map.coast[i + 1] ?? 0) * t;
}

export function isSea (map: Pick<GameMap, 'coast'>, x: number, y: number) {
  return y > coastAt(map, x);
}

function edgeDistance (x: number, y: number) {
  return Math.min(x, y, WORLD.width - x, WORLD.height - y) / UNIT;
}

function buildCoast (phase: number) {
  const coast: number[] = [];

  for (let x = 0; x <= WORLD.width + COAST_STEP; x += COAST_STEP) {
    const cove = 150 * Math.exp(-(((x - LIGHTHOUSE.x) / 300) ** 2));
    coast.push(900 + 45 * Math.sin(x * 0.005 + phase) + 30 * Math.sin(x * 0.013 + phase * 2) - cove);
  }

  return coast;
}

export function makeSlot (map: GameMap, point: Point, ring: number, kind: SlotKind): Slot {
  return {
    id: map.slots.length,
    x: point.x,
    y: point.y,
    ring,
    kind,
    shore: coastAt(map, point.x) - point.y < SHORE_REACH,
    wreckIron: kind === 'wreck' ? GAME.wreckIron : 0,
    edgeDistance: edgeDistance(point.x, point.y)
  };
}

export function createMap (seed: number): GameMap {
  const rng = createRng(seed);
  const phase = rng.range(0, Math.PI * 2);

  const map: GameMap = {
    width: WORLD.width,
    height: WORLD.height,
    lighthouse: LIGHTHOUSE,
    coast: buildCoast(phase),
    slots: [],
    rocks: [],
    maxEdge: 0
  };

  const wrecks = [
    ...SHORE_WRECK_X.map(x => ({ x, y: coastAt(map, x) - 34 })),
    INLAND_WRECK
  ];

  const sites = [...OIL_SITES, ...wrecks];

  for (let attempt = 0; attempt < 400 && map.rocks.length < 16; attempt++) {
    const rock = { x: rng.range(60, WORLD.width - 60), y: rng.range(60, WORLD.height - 60), r: rng.range(16, 38), seed: rng.next() };
    const nearCenter = Math.hypot(rock.x - LIGHTHOUSE.x, rock.y - LIGHTHOUSE.y) < ringRadius(2) + 30;
    const nearSite = sites.some(s => Math.hypot(s.x - rock.x, s.y - rock.y) < SITE_CLEARANCE + rock.r);

    if (!nearCenter && !nearSite && coastAt(map, rock.x) - rock.y > rock.r + 10) {
      map.rocks.push(rock);
    }
  }

  for (let ring = 1; ring <= RINGS; ring++) {
    const r = ringRadius(ring);
    const count = Math.round((Math.PI * 2 * r) / SLOT_SPACING);
    const offset = ring % 2 ? 0 : Math.PI / count;

    for (let i = 0; i < count; i++) {
      const angle = offset + (i / count) * Math.PI * 2;
      const point = { x: LIGHTHOUSE.x + Math.cos(angle) * r, y: LIGHTHOUSE.y + Math.sin(angle) * r };
      const onLand = coastAt(map, point.x) - point.y > 22;
      const inside = point.x > 40 && point.y > 40 && point.x < WORLD.width - 40;
      const blocked = map.rocks.some(rock => Math.hypot(rock.x - point.x, rock.y - point.y) < rock.r + SLOT_RADIUS)
        || sites.some(s => Math.hypot(s.x - point.x, s.y - point.y) < SITE_CLEARANCE);

      if (onLand && inside && !blocked) {
        map.slots.push(makeSlot(map, point, ring, 'ring'));
      }
    }
  }

  for (const site of OIL_SITES) {
    map.slots.push(makeSlot(map, site, 0, 'oil'));
  }

  for (const site of wrecks) {
    map.slots.push(makeSlot(map, site, 0, 'wreck'));
  }

  map.maxEdge = Math.max(edgeDistance(LIGHTHOUSE.x, LIGHTHOUSE.y), ...map.slots.map(s => s.edgeDistance));

  return map;
}

export function slotNear (map: GameMap, x: number, y: number, reach = SLOT_RADIUS + 8) {
  let best: Slot | undefined;
  let bestDistance = reach;

  for (const s of map.slots) {
    const d = Math.hypot(s.x - x, s.y - y);

    if (d < bestDistance) {
      best = s;
      bestDistance = d;
    }
  }

  return best;
}
