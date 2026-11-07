import { BUILDINGS } from '@/game/config';
import { DARK, DIM, levelAt, LIT, lightParams } from '@/game/light';
import { lightAt, shadowAt } from '@/game/sim';
import type { Building, GameState } from '@/game/state';

export interface BuildingStatus {
  key: string;
  tone: string;
}

/**
 * What the light means for a building, in words that fit what it does: a workplace slows or stops, a home frightens
 * or loses its residents, a lantern is a light itself. Returns null when there is nothing to warn about.
 */
export function buildingStatus (state: GameState, building: Building): BuildingStatus | null {
  const def = BUILDINGS[building.type];
  const home = !!def.housing;

  if (building.type === 'lantern' || building.type === 'lighthouse') {
    return null;
  }

  if (state.phase === 'day') {
    const level = levelAt(lightParams(state, true), building.x, building.y);

    if (level === LIT) {
      return null;
    }

    if (level === DIM) {
      return { key: home ? 'risk.dimHome' : 'risk.dim', tone: 'text-warm' };
    }

    return { key: home ? 'risk.darkHome' : 'risk.dark', tone: 'text-danger' };
  }

  if (shadowAt(state, building.slot) >= 0.7) {
    return { key: home ? 'card.inShadowHome' : 'card.inShadow', tone: 'text-danger' };
  }

  const level = lightAt(state, building.slot);

  if (level === DIM || level === DARK) {
    return { key: home ? 'card.dimHome' : 'card.dim', tone: 'text-warm' };
  }

  return null;
}
