import { BEAM_MODES, GAME, LIGHT, UNIT } from './config';
import type { Point } from './map';
import type { GameState } from './state';

/** Everything the light depends on, in world pixels; the darkness shader receives the same numbers. */
export interface LightParams {
  origin: Point;
  lit: number;
  dim: number;
  beamAngle: number;
  beamHalfArc: number;
  beamLength: number;
  lanterns: Point[];
  lanternLit: number;
  lanternDim: number;
}

export const LIT = 2;
export const DIM = 1;
export const DARK = 0;

export const MAX_LANTERNS = 24;

function smoothstep (edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));

  return t * t * (3 - 2 * t);
}

function angleDelta (a: number, b: number) {
  const d = Math.abs(a - b) % (Math.PI * 2);

  return d > Math.PI ? Math.PI * 2 - d : d;
}

export function lighthouseBurning (state: GameState) {
  return state.mode !== 'off' && state.resources.oil > 0 && state.phase !== 'day';
}

export function lighthouseReach (state: GameState) {
  const keepers = state.buildings.find(b => b.type === 'lighthouse')?.workers ?? 0;

  return keepers >= 2 ? 1 : GAME.keeperlessReach;
}

/** `planned` describes the light the coming night will have, so it can be shown by day too. */
export function lightParams (state: GameState, planned = false): LightParams {
  const burning = planned ? state.mode !== 'off' : lighthouseBurning(state);
  const reach = lighthouseReach(state) * UNIT;
  const lens = state.lens ? LIGHT.lens : 0;
  const lanternsOn = planned || (state.phase !== 'day' && state.resources.oil > 0);

  const params: LightParams = {
    origin: state.map.lighthouse,
    lit: 0,
    dim: 0,
    beamAngle: state.beamAngle,
    beamHalfArc: GAME.beamArc / 2,
    beamLength: 0,
    lanterns: lanternsOn ? state.buildings.filter(b => b.type === 'lantern').slice(0, MAX_LANTERNS) : [],
    lanternLit: LIGHT.lantern.lit * UNIT,
    lanternDim: LIGHT.lantern.dim * UNIT
  };

  if (!burning || state.mode === 'off') {
    return params;
  }

  const radii = LIGHT[state.mode];
  params.lit = (radii.lit + lens) * reach;
  params.dim = (radii.dim + lens) * reach;

  if (state.mode === 'beam') {
    params.beamLength = (LIGHT.beam.length + lens) * reach;
  }

  return params;
}

/** 1 in full light, 0 in darkness. Mirrors `lightAmount` in the darkness shader. */
export function lightAmount (p: LightParams, x: number, y: number) {
  const dx = x - p.origin.x;
  const dy = y - p.origin.y;
  const d = Math.hypot(dx, dy);
  let amount = p.dim > 0 ? 1 - smoothstep(p.lit, p.dim, d) : 0;

  if (p.beamLength > 0) {
    const along = 1 - smoothstep(p.beamLength * 0.8, p.beamLength, d);
    const across = 1 - smoothstep(p.beamHalfArc * 0.75, p.beamHalfArc, angleDelta(Math.atan2(dy, dx), p.beamAngle));
    amount = Math.max(amount, along * across);
  }

  for (const lantern of p.lanterns) {
    amount = Math.max(amount, 1 - smoothstep(p.lanternLit, p.lanternDim, Math.hypot(x - lantern.x, y - lantern.y)));
  }

  return amount;
}

export function levelAt (params: LightParams, x: number, y: number) {
  const amount = lightAmount(params, x, y);

  return amount >= LIGHT.litAbove ? LIT : amount >= LIGHT.dimAbove ? DIM : DARK;
}

/** What tonight's light means for a spot, as the translation key the HUD warns with. */
export function tonightRisk (state: GameState, x: number, y: number) {
  const level = levelAt(lightParams(state, true), x, y);

  if (level === LIT) {
    return { level, key: 'risk.lit', tone: 'text-warm' };
  }

  if (level === DIM) {
    return { level, key: 'risk.dim', tone: 'text-warm' };
  }

  return { level, key: 'risk.dark', tone: 'text-danger' };
}

export function computeLight (state: GameState) {
  if (state.phase === 'day') {
    state.light.fill(LIT);

    return;
  }

  const params = lightParams(state);

  state.map.slots.forEach((slot, i) => {
    state.light[i] = levelAt(params, slot.x, slot.y);
  });
}

export function oilPerHour (state: GameState) {
  const lanterns = state.buildings.filter(b => b.type === 'lantern').length;

  return BEAM_MODES[state.mode].oilPerHour + lanterns * GAME.lanternOilPerHour;
}
