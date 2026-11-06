import { describe, expect, it } from 'vitest';
import { computeLight, DARK, LIT } from './light';
import { advance, canPlace, nightHours, population, shadowAt } from './sim';
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
