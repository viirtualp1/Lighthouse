import { BEAM_MODES, GAME, LIGHT, NIGHT_HOURS, RESTORATION, UNIT } from './config';
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

/** The lamp burns through dusk and night, and keeps burning over the first morning hour while the Shadow draws back. */
export function lighthouseBurning (state: GameState) {
  const morning = state.day > 1 && state.hour < GAME.dawnHours;

  return state.mode !== 'off' && state.resources.oil > 0 && (state.phase !== 'day' || morning);
}

/** The Longest Night: the last one. Without the Great Light the Shadow presses the light back. */
export function isFinalNight (state: GameState) {
  return state.day === NIGHT_HOURS.length && state.phase !== 'day';
}

export function greatLightLit (state: GameState) {
  return state.restoration.stage >= RESTORATION.length;
}

export function lighthouseReach (state: GameState) {
  const keepers = state.buildings.find(b => b.type === 'lighthouse')?.workers ?? 0;
  const keeperReach = keepers >= 2 ? 1 : GAME.keeperlessReach;
  const finale = isFinalNight(state) && !greatLightLit(state) ? GAME.finaleReach : 1;

  return keeperReach * finale;
}

/** Extra reach, in rings, from the restoration stages finished so far (or up to `stages`, for previews). */
export function restorationRings (stages: number) {
  return RESTORATION.slice(0, stages).reduce((sum, stage) => sum + stage.rings, 0);
}

/**
 * `planned` describes the light the coming night will have, so it can be shown by day too; `stages` overrides how
 * much of the restoration is done, to preview what the next stage would give.
 */
export function lightParams (state: GameState, planned = false, stages = state.restoration.stage): LightParams {
  const burning = planned ? state.mode !== 'off' : lighthouseBurning(state);
  const reach = lighthouseReach(state) * UNIT;
  const rings = restorationRings(stages);
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
  params.lit = (radii.lit + rings) * reach;
  params.dim = (radii.dim + rings) * reach;

  if (state.mode === 'beam') {
    params.beamLength = (LIGHT.beam.length + rings) * reach;
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
  if (state.phase === 'day' && !lighthouseBurning(state)) {
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
  const saving = RESTORATION.slice(0, state.restoration.stage).reduce((sum, stage) => sum + (stage.oilSaving ?? 0), 0);

  return BEAM_MODES[state.mode].oilPerHour * (1 - saving) + lanterns * GAME.lanternOilPerHour;
}
