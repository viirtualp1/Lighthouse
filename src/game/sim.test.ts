import { describe, expect, it } from 'vitest';
import { GAME, NIGHT_HOURS, RESTORATION } from './config';
import { computeLight, DARK, lightAmount, lightParams, LIT } from './light';
import { advance, assignedWorkers, canCollect, canPlace, collectFind, nightHours, population, setBuilders, shadowAt, startStage } from './sim';
import { createState } from './state';
import type { GameState } from './state';

function atNight (state: GameState, hoursIn = 0.5) {
  state.hour = 24 - nightHours(state) + hoursIn;
  state.phase = 'night';
  computeLight(state);

  return state;
}

function slotOnRing (state: GameState, ring: number) {
  return state.map.slots.find(s => s.ring === ring && s.kind === 'ring')!;
}

describe('new game', () => {
  it('starts with the Lighthouse, four huts and staffed food and wood', () => {
    const state = createState(1);
    const types = state.buildings.map(b => b.type);

    expect(types.filter(t => t === 'hut')).toHaveLength(4);
    expect(types).toContain('lighthouse');
    expect(types).toContain('dock');
    expect(state.map.slots[state.buildings.find(b => b.type === 'dock')!.slot]!.shore).toBe(true);
  });
});

describe('light', () => {
  it('lights the inner rings and leaves the outer ring dark', () => {
    const state = atNight(createState(2));

    expect(state.light[slotOnRing(state, 1).id]).toBe(LIT);
    expect(state.light[slotOnRing(state, 7).id]).toBe(DARK);
  });

  it('goes out everywhere when the oil runs dry', () => {
    const state = createState(3);
    state.resources.oil = 0;
    atNight(state);

    expect(state.light[slotOnRing(state, 1).id]).toBe(DARK);
  });
});

describe('placement', () => {
  it('keeps docks on the shore and oil collectors on oil', () => {
    const state = createState(4);
    const inland = state.map.slots.find(s => s.kind === 'ring' && !s.shore && !state.buildings.some(b => b.slot === s.id))!;
    const oil = state.map.slots.find(s => s.kind === 'oil')!;

    expect(canPlace(state, 'dock', inland.id)).toBe('shoreOnly');
    expect(canPlace(state, 'oilCollector', inland.id)).toBe('oilOnly');
    expect(canPlace(state, 'oilCollector', oil.id)).toBeNull();
  });
});

describe('night', () => {
  it('lets the Shadow fill the dark outskirts but not the lit centre', () => {
    const state = atNight(createState(5), 0);
    state.shadowFront = 20;
    advance(state, 2);

    expect(shadowAt(state, slotOnRing(state, 7).id)).toBeGreaterThan(0.7);
    expect(shadowAt(state, slotOnRing(state, 1).id)).toBe(0);
  });

  it('raises Fear quickly when the Lighthouse is put out', () => {
    const state = atNight(createState(6));
    state.mode = 'off';
    const before = state.fear;
    advance(state, 1);

    expect(state.fear - before).toBeGreaterThanOrEqual(10);
  });
});

describe('dawn', () => {
  it('feeds everyone and shows the report only once the Shadow has drawn back', () => {
    const state = createState(7);
    state.hour = 23.99;
    state.phase = 'night';
    const fish = state.resources.fish;
    const people = population(state);
    advance(state, 0.05);

    expect(state.day).toBe(2);
    expect(state.resources.fish).toBeCloseTo(fish - people, 0);
    expect(state.dawnReport).toBeNull();

    advance(state, 1);

    expect(state.dawnReport?.eaten).toBe(people);
  });
});

describe('restoration', () => {
  it('takes materials, then builders, and pushes the light a ring further', () => {
    const state = createState(8);
    state.resources.wood = 100;
    state.resources.iron = 100;
    const before = lightParams(state, true).lit;

    startStage(state);
    expect(state.resources.wood).toBe(100 - RESTORATION[0]!.cost.wood!);
    expect(state.restoration.started).toBe(true);

    setBuilders(state, GAME.maxBuilders);
    expect(assignedWorkers(state)).toBeGreaterThanOrEqual(GAME.maxBuilders);

    advance(state, RESTORATION[0]!.work / GAME.maxBuilders + 1);

    expect(state.restoration.stage).toBe(1);
    expect(lightParams(state, true).lit).toBeGreaterThan(before);
  });

  it('lets the Shadow press the light back on the Longest Night unless the Great Light burns', () => {
    const dark = atNight(createState(9));
    dark.day = NIGHT_HOURS.length;
    const lit = atNight(createState(9));
    lit.day = NIGHT_HOURS.length;
    lit.restoration.stage = RESTORATION.length;

    expect(lightParams(dark).lit).toBeLessThan(lightParams(atNight(createState(9))).lit);
    expect(lightParams(lit).lit).toBeGreaterThan(lightParams(atNight(createState(9))).lit);
  });
});

describe('finds', () => {
  it('lie beyond the steady light, so they have to be searched for', () => {
    const state = atNight(createState(10));
    const params = lightParams(state);

    expect(state.finds.length).toBeGreaterThan(0);
    state.finds.forEach(find => expect(lightAmount(params, find.x, find.y)).toBeLessThan(0.5));
  });

  it('are found by holding the beam on them, and collected only by day', () => {
    const state = atNight(createState(11), 0.5);
    const { x, y } = state.map.lighthouse;
    const find = [...state.finds].sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0]!;
    state.mode = 'beam';
    state.beamAngle = Math.atan2(find.y - y, find.x - x);
    advance(state, 1);

    expect(find.found).toBe(true);
    expect(canCollect(state, find.id)).toBe(false);

    state.phase = 'day';
    const oil = state.resources.oil;
    collectFind(state, find.id);


    expect(find.collected).toBe(true);
    expect(state.resources.oil).toBe(oil + (find.reward.oil ?? 0));
  });

  it('turn a found wreck into a new salvage site', () => {
    const state = createState(12);
    const wreck = state.finds.find(f => f.kind === 'wreck')!;
    const slots = state.map.slots.length;
    wreck.found = true;
    collectFind(state, wreck.id);

    expect(state.map.slots).toHaveLength(slots + 1);
    expect(state.map.slots.at(-1)!.kind).toBe('wreck');
    expect(state.light).toHaveLength(slots + 1);
  });
});
