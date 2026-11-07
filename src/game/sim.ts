import { BUILDINGS, GAME, NIGHT_HOURS } from './config';
import { computeLight, DIM, LIT, lighthouseBurning, oilPerHour } from './light';
import { addBuilding } from './state';
import type { BeamMode, BuildingId, ResourceId } from './config';
import type { Building, DawnReport, GameState, LogEntry, Message, Phase } from './state';

const SHADOW_TAKES = 0.7;
const SHADOW_DIM_TARGET = 0.4;
const SHADOW_RETREAT_PER_HOUR = 3;
const LOG_LIMIT = 40;

export function nightHours (state: GameState) {
  return NIGHT_HOURS[Math.min(state.day, NIGHT_HOURS.length) - 1] ?? 6;
}

export function phaseAt (state: GameState, hour: number): Phase {
  const nightStart = 24 - nightHours(state);

  if (hour >= nightStart) {
    return 'night';
  }

  if (hour >= nightStart - GAME.duskHours) {
    return 'dusk';
  }

  return 'day';
}

/** 0 by day, rising through dusk to 1 at night and fading over the morning hour while the Shadow draws back. */
export function nightness (state: GameState) {
  const nightStart = 24 - nightHours(state);
  const duskStart = nightStart - GAME.duskHours;

  if (state.hour >= nightStart) {
    return 1;
  }

  if (state.hour >= duskStart) {
    return (state.hour - duskStart) / GAME.duskHours;
  }

  return state.day > 1 && state.hour < GAME.dawnHours ? 1 - state.hour / GAME.dawnHours : 0;
}

export function clockOf (hour: number) {
  const total = (GAME.dayStartClock + hour) % 24;
  const h = Math.floor(total);
  const m = Math.floor((total - h) * 60);

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function population (state: GameState) {
  return state.healthy + state.sick;
}

export function assignedWorkers (state: GameState) {
  return state.buildings.reduce((sum, b) => sum + b.workers, 0);
}

export function housing (state: GameState) {
  return state.buildings.reduce((sum, b) => sum + (BUILDINGS[b.type].housing ?? 0), 0);
}

export function shadowAt (state: GameState, slot: number) {
  return slot < 0 ? 0 : state.shadow[slot] ?? 0;
}

export function lightAt (state: GameState, slot: number) {
  return slot < 0 ? LIT : state.light[slot] ?? 0;
}

/** How well a building works right now: full in daylight or lamplight, half in the dim, not at all in the Shadow. */
export function workFactor (state: GameState, building: Building) {
  if (state.phase !== 'night') {
    return 1;
  }

  if (shadowAt(state, building.slot) >= SHADOW_TAKES) {
    return 0;
  }

  return lightAt(state, building.slot) === LIT ? 1 : 0.5;
}

export function fearFactor (state: GameState) {
  return 1 - state.fear / 200;
}

export type PlaceError = 'invalid' | 'taken' | 'shoreOnly' | 'oilOnly' | 'wreckOnly' | 'landOnly' | 'limit' | 'cost';

export function log (state: GameState, key: string, params: Message['params'] = {}, tone: LogEntry['tone'] = 'info') {
  state.log.unshift({ id: state.nextId++, day: state.day, clock: clockOf(state.hour), key, params, tone, at: state.elapsed });
  state.log.length = Math.min(state.log.length, LOG_LIMIT);
}

export function canPlace (state: GameState, type: BuildingId, slotId: number): PlaceError | null {
  const def = BUILDINGS[type];
  const slot = state.map.slots[slotId];

  if (!slot || def.placement === 'fixed') {
    return 'invalid';
  }

  if (state.buildings.some(b => b.slot === slotId)) {
    return 'taken';
  }

  if (def.placement === 'shore' && !(slot.kind === 'ring' && slot.shore)) {
    return 'shoreOnly';
  }

  if (def.placement === 'oil' && slot.kind !== 'oil') {
    return 'oilOnly';
  }

  if (def.placement === 'wreck' && slot.kind !== 'wreck') {
    return 'wreckOnly';
  }

  if (def.placement === 'land' && slot.kind !== 'ring') {
    return 'landOnly';
  }

  if (def.limit && state.buildings.filter(b => b.type === type).length >= def.limit) {
    return 'limit';
  }

  return canAfford(state, type) ? null : 'cost';
}

export function canAfford (state: GameState, type: BuildingId) {
  const cost = BUILDINGS[type].cost;

  return (Object.keys(cost) as ResourceId[]).every(r => state.resources[r] >= (cost[r] ?? 0));
}

export function build (state: GameState, type: BuildingId, slotId: number) {
  if (canPlace(state, type, slotId)) {
    return null;
  }

  const cost = BUILDINGS[type].cost;

  for (const r of Object.keys(cost) as ResourceId[]) {
    state.resources[r] -= cost[r] ?? 0;
  }

  const building = addBuilding(state, type, slotId, 0);
  state.effects.push({ kind: 'build', x: building.x, y: building.y });
  log(state, 'log.built', { building: type });

  return building;
}

export function demolish (state: GameState, id: number) {
  const building = state.buildings.find(b => b.id === id);

  if (!building || building.type === 'lighthouse') {
    return;
  }

  state.buildings = state.buildings.filter(b => b.id !== id);
  state.revision++;
  state.effects.push({ kind: 'demolish', x: building.x, y: building.y });
  log(state, 'log.demolished', { building: building.type });
}

export function setWorkers (state: GameState, id: number, workers: number) {
  const building = state.buildings.find(b => b.id === id);

  if (!building) {
    return;
  }

  const free = state.healthy - assignedWorkers(state) + building.workers;
  const before = building.workers;
  building.workers = Math.max(0, Math.min(workers, BUILDINGS[building.type].maxWorkers, free));

  if (building.workers !== before) {
    state.effects.push({ kind: 'assign', x: building.x, y: building.y });
  }
}

export function setMode (state: GameState, mode: BeamMode) {
  state.mode = mode;
  computeLight(state);
}

export function setBeamAngle (state: GameState, angle: number) {
  state.beamAngle = angle;
  computeLight(state);
}

export function buyLens (state: GameState) {
  if (state.lens || state.resources.iron < GAME.lensIron) {
    return;
  }

  state.resources.iron -= GAME.lensIron;
  state.lens = true;
  log(state, 'log.lens', {}, 'good');
  computeLight(state);
}

function fitWorkersToHealthy (state: GameState) {
  let extra = assignedWorkers(state) - state.healthy;

  for (let i = state.buildings.length - 1; i >= 0 && extra > 0; i--) {
    const building = state.buildings[i]!;
    const take = Math.min(building.workers, extra);
    building.workers -= take;
    extra -= take;
  }
}

/** Takes one person away, healthy or sick in proportion, and frees their workplace if they had one. */
function removePerson (state: GameState, from?: Building) {
  const pop = population(state);

  if (pop <= 0) {
    return;
  }

  if (from && from.workers > 0) {
    from.workers--;
    state.healthy--;

    return;
  }

  if (state.rng.next() < state.sick / pop) {
    state.sick--;
  } else {
    state.healthy--;
    fitWorkersToHealthy(state);
  }
}

/** Who sleeps where: the safest huts fill first, everyone left over sleeps in the open. */
function residents (state: GameState) {
  const huts = state.buildings
    .filter(b => BUILDINGS[b.type].housing)
    .sort((a, b) => shadowAt(state, a.slot) - shadowAt(state, b.slot));

  let left = population(state);

  const homes = huts.map(hut => {
    const count = Math.min(left, BUILDINGS[hut.type].housing ?? 0);
    left -= count;

    return { hut, count };
  });

  return { homes, homeless: left };
}

/** How many people sleep in this hut tonight. */
export function residentsOf (state: GameState, buildingId: number) {
  return residents(state).homes.find(home => home.hut.id === buildingId)?.count ?? 0;
}

function produce (state: GameState, hours: number) {
  const k = fearFactor(state);

  for (const b of state.buildings) {
    const output = b.workers * workFactor(state, b) * k * hours;

    if (output <= 0) {
      continue;
    }

    if (b.type === 'dock') {
      state.resources.fish += output;
    } else if (b.type === 'driftwood') {
      state.resources.wood += output;
    } else if (b.type === 'oilCollector') {
      state.resources.oil += output * 0.5;
    } else if (b.type === 'renderer') {
      const made = Math.min(output, state.resources.fish / 2);
      state.resources.fish -= made * 2;
      state.resources.oil += made;
    } else if (b.type === 'salvage') {
      const slot = state.map.slots[b.slot];
      const got = Math.min(output * 0.5, slot?.wreckIron ?? 0);

      if (slot) {
        slot.wreckIron -= got;
      }

      state.resources.iron += got;
    } else if (b.type === 'infirmary') {
      b.progress += output / BUILDINGS.infirmary.maxWorkers;

      while (b.progress >= GAME.healHoursPerPatient && state.sick > 0) {
        b.progress -= GAME.healHoursPerPatient;
        state.sick--;
        state.healthy++;
      }

      if (state.sick === 0) {
        b.progress = 0;
      }
    }
  }
}

function burnOil (state: GameState, hours: number) {
  if (state.phase === 'day') {
    return;
  }

  state.resources.oil = Math.max(0, state.resources.oil - oilPerHour(state) * hours);

  if (state.resources.oil <= 0 && !state.oilOutWarned) {
    state.oilOutWarned = true;
    state.effects.push({ kind: 'oilOut' });
    log(state, 'log.oilOut', {}, 'bad');
  }

  if (state.resources.oil > 0) {
    state.oilOutWarned = false;
  }
}

function moveShadow (state: GameState, hours: number) {
  const creeping = state.phase !== 'day';
  const speed = creeping ? GAME.shadowSpeed : -GAME.shadowRetreatSpeed;
  state.shadowFront = Math.max(0, Math.min(state.map.maxEdge + 1, state.shadowFront + speed * hours));

  state.map.slots.forEach((slot, i) => {
    const level = state.light[i] ?? 0;
    const reached = slot.edgeDistance < state.shadowFront;
    const target = !reached || level === LIT ? 0 : level === DIM ? SHADOW_DIM_TARGET : 1;
    const current = state.shadow[i] ?? 0;
    const rate = target > current ? GAME.shadowFillPerHour : SHADOW_RETREAT_PER_HOUR;
    const step = Math.min(Math.abs(target - current), rate * hours);
    state.shadow[i] = current + Math.sign(target - current) * step;
  });
}

/** How fast Fear is moving right now, per hour: positive while it grows. */
export function fearRate (state: GameState) {
  let delta = 0;

  if (state.phase === 'night') {
    const pop = Math.max(1, population(state));
    const { homes, homeless } = residents(state);
    let dark = homeless;
    let dim = 0;

    for (const { hut, count } of homes) {
      const s = shadowAt(state, hut.slot);

      if (s >= SHADOW_TAKES) {
        dark += count;
      } else if (s > 0.05 || lightAt(state, hut.slot) === DIM) {
        dim += count;
      }
    }

    delta += (dark / pop) * 10 * GAME.fearPerDarkTenth + (dim / pop) * 10 * GAME.fearPerDimTenth;

    if (!lighthouseBurning(state)) {
      delta += GAME.fearLighthouseOff;
    }
  } else {
    delta -= GAME.fearDayDecay;
  }

  if (state.buildings.some(b => b.type === 'chapel' && b.workers > 0)) {
    delta -= GAME.fearChapel;
  }

  return delta;
}

function changeFear (state: GameState, hours: number) {
  state.fear = Math.max(0, Math.min(GAME.fearLoseAt, state.fear + fearRate(state) * hours));
}

function shadowTakes (state: GameState) {
  const chance = GAME.vanishChancePerHour;
  let taken = 0;

  for (const b of state.buildings) {
    if (b.workers > 0 && shadowAt(state, b.slot) >= SHADOW_TAKES) {
      const before = b.workers;

      for (let i = 0; i < before; i++) {
        if (state.rng.chance(chance)) {
          removePerson(state, b);
          state.effects.push({ kind: 'vanish', x: b.x, y: b.y });
          taken++;
        }
      }
    }
  }

  for (const { hut, count } of residents(state).homes) {
    if (shadowAt(state, hut.slot) < SHADOW_TAKES) {
      continue;
    }

    for (let i = 0; i < count; i++) {
      if (state.rng.chance(chance)) {
        removePerson(state);
        state.effects.push({ kind: 'vanish', x: hut.x, y: hut.y });
        taken++;
      }
    }
  }

  if (taken > 0) {
    state.vanishedTonight += taken;
    log(state, taken === 1 ? 'log.takenOne' : 'log.takenMany', { n: taken }, 'bad');
  }
}

function rollEach (state: GameState, count: number, chance: number) {
  let hits = 0;

  for (let i = 0; i < count; i++) {
    if (state.rng.chance(chance)) {
      hits++;
    }
  }

  return hits;
}

function dawn (state: GameState) {
  const report: DawnReport = {
    day: state.day,
    eaten: 0,
    hungry: 0,
    gotSick: 0,
    died: 0,
    recovered: 0,
    vanished: state.vanishedTonight,
    deserted: 0
  };

  const pop = population(state);
  report.eaten = Math.min(pop, Math.floor(state.resources.fish));
  state.resources.fish -= report.eaten;
  report.hungry = pop - report.eaten;

  if (report.hungry > 0) {
    const hungryHealthy = Math.round((report.hungry * state.healthy) / Math.max(1, pop));
    const hungrySick = report.hungry - hungryHealthy;
    report.died = rollEach(state, hungrySick, GAME.hungrySickDeathChance);
    report.gotSick = rollEach(state, hungryHealthy, GAME.hungrySickChance);
    state.sick += report.gotSick - report.died;
    state.healthy -= report.gotSick;
  }

  report.recovered = rollEach(state, state.sick, GAME.naturalRecovery);
  state.sick -= report.recovered;
  state.healthy += report.recovered;

  if (state.fear >= GAME.fearDesertAt) {
    report.deserted = Math.min(population(state), state.rng.int(1, 2));

    for (let i = 0; i < report.deserted; i++) {
      removePerson(state);
    }
  }

  fitWorkersToHealthy(state);
  state.vanishedTonight = 0;
  state.pendingReport = report;
  state.day++;

  if (report.died > 0) {
    log(state, 'log.died', { n: report.died }, 'bad');
  }

  if (report.deserted > 0) {
    log(state, 'log.deserted', { n: report.deserted }, 'bad');
  }

  if (state.day > GAME.daysToWin && population(state) >= GAME.minPopulation) {
    finish(state, 'won', { key: 'end.wonReason', params: { day: GAME.daysToWin + 1, n: population(state) } });
  }
}

function finish (state: GameState, status: GameState['status'], reason: Message) {
  state.status = status;
  state.endReason = reason;
  state.speed = 0;
}

function checkLoss (state: GameState) {
  if (state.status !== 'playing') {
    return;
  }

  if (state.fear >= GAME.fearLoseAt) {
    finish(state, 'lost', { key: 'end.fearReason', params: {} });
  } else if (population(state) < GAME.minPopulation) {
    finish(state, 'lost', { key: 'end.popReason', params: { n: GAME.minPopulation } });
  }
}

function announcePhase (state: GameState, previous: Phase) {
  if (previous === state.phase) {
    return;
  }

  if (state.phase !== 'day') {
    state.effects.push({ kind: state.phase });
  }

  if (state.phase === 'dusk') {
    log(state, 'log.dusk', { h: nightHours(state) }, 'warn');
  } else if (state.phase === 'night') {
    log(state, 'log.night', {}, 'warn');
  }
}

/** Advances the world by `hours` of game time, in small steps so the Shadow and the hourly rolls stay smooth. */
export function advance (state: GameState, hours: number) {
  let left = hours;

  while (left > 0 && state.status === 'playing' && !state.dawnReport) {
    const step = Math.min(left, 0.05);
    const before = state.hour;
    const previousPhase = state.phase;

    state.hour += step;
    state.elapsed += step;
    left -= step;

    if (state.hour >= 24) {
      state.hour = 0;
      state.phase = 'day';
      dawn(state);
      computeLight(state);
      checkLoss(state);

      continue;
    }

    state.phase = phaseAt(state, state.hour);
    announcePhase(state, previousPhase);
    computeLight(state);
    produce(state, step);
    burnOil(state, step);
    moveShadow(state, step);
    changeFear(state, step);

    if (state.phase === 'night' && Math.floor(state.hour) !== Math.floor(before)) {
      shadowTakes(state);
    }

    if (state.pendingReport && state.hour >= GAME.dawnHours) {
      state.dawnReport = state.pendingReport;
      state.pendingReport = null;
      state.effects.push({ kind: 'dawn' });
    }

    checkLoss(state);
  }
}

/** Expected change of each resource over the next hour at the current light, staff and Fear. */
export function rates (state: GameState) {
  const k = fearFactor(state);
  const result: Record<ResourceId, number> = { oil: 0, fish: 0, wood: 0, iron: 0 };

  for (const b of state.buildings) {
    const output = b.workers * workFactor(state, b) * k;

    if (b.type === 'dock') {
      result.fish += output;
    } else if (b.type === 'driftwood') {
      result.wood += output;
    } else if (b.type === 'oilCollector') {
      result.oil += output * 0.5;
    } else if (b.type === 'renderer') {
      result.fish -= output * 2;
      result.oil += output;
    } else if (b.type === 'salvage') {
      result.iron += (state.map.slots[b.slot]?.wreckIron ?? 0) > 0 ? output * 0.5 : 0;
    }
  }

  if (state.phase !== 'day') {
    result.oil -= oilPerHour(state);
  }

  return result;
}

export interface RateSource {
  /** A building type, or 'beam' / 'lanterns' for the light's own burn. */
  source: BuildingId | 'beam' | 'lanterns';
  amount: number;
}

/** Where each resource's hourly change comes from, grouped by building type, for the supplies tooltip. */
export function rateBreakdown (state: GameState) {
  const result: Record<ResourceId, RateSource[]> = { oil: [], fish: [], wood: [], iron: [] };
  const k = fearFactor(state);

  const add = (resource: ResourceId, source: RateSource['source'], amount: number) => {
    if (Math.abs(amount) < 0.01) {
      return;
    }

    const row = result[resource].find(r => r.source === source);

    if (row) {
      row.amount += amount;
    } else {
      result[resource].push({ source, amount });
    }
  };

  for (const b of state.buildings) {
    const output = b.workers * workFactor(state, b) * k;

    if (b.type === 'dock') {
      add('fish', 'dock', output);
    } else if (b.type === 'driftwood') {
      add('wood', 'driftwood', output);
    } else if (b.type === 'oilCollector') {
      add('oil', 'oilCollector', output * 0.5);
    } else if (b.type === 'renderer') {
      add('fish', 'renderer', -output * 2);
      add('oil', 'renderer', output);
    } else if (b.type === 'salvage' && (state.map.slots[b.slot]?.wreckIron ?? 0) > 0) {
      add('iron', 'salvage', output * 0.5);
    }
  }

  if (state.phase !== 'day') {
    const lanterns = state.buildings.filter(b => b.type === 'lantern').length;
    add('oil', 'beam', -(oilPerHour(state) - lanterns * GAME.lanternOilPerHour));
    add('oil', 'lanterns', -lanterns * GAME.lanternOilPerHour);
  }

  return result;
}

/** How much a building turns out right now, as a share of a full shift: light and Fear both cut into it. */
export function efficiency (state: GameState, building: Building) {
  return { total: workFactor(state, building) * fearFactor(state), light: workFactor(state, building), fear: fearFactor(state) };
}

export function closeDawnReport (state: GameState) {
  state.dawnReport = null;
}

export function forecast (state: GameState, days = 4) {
  return Array.from({ length: days }, (_, i) => {
    const day = state.day + i;
    const hours = NIGHT_HOURS[day - 1];

    return hours === undefined ? null : { day, hours, oil: Math.ceil(hours * oilPerHour(state)) };
  }).filter(f => f !== null);
}
