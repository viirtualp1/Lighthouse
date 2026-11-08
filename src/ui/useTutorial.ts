import { computed, ref, watch } from 'vue';
import { BUILDINGS } from '@/game/config';
import { housing, population } from '@/game/sim';
import { useGame } from './useGame';
import type { BuildingId } from '@/game/config';
import type { Point } from '@/game/map';
import type { GameState } from '@/game/state';

export interface TutorialStep {
  /** Its texts live under `tutorial.steps.<id>` in the dictionaries. */
  id: string;
  hasTask?: boolean;
  /** The building this task is about: when the player opens it, the focus moves to its card. */
  subject?: BuildingId;
  /** A HUD element to point at, by its `data-tour` name. */
  target?: string;
  /** A spot on the map to point at. */
  spot?: (state: GameState) => Point | null;
  /** The step finishes on its own once this holds; steps without it wait for "Next". */
  done?: (state: GameState) => boolean;
}

const DONE_KEY = 'lighthouse.tutorialDone';

const STEPS: TutorialStep[] = [
  {
    id: 'intro'
  },
  {
    id: 'lighthouse',
    spot: state => state.map.lighthouse
  },
  {
    id: 'clock',
    target: 'clock'
  },
  {
    id: 'workers',
    hasTask: true,
    subject: 'dock',
    spot: state => state.buildings.find(b => b.type === 'dock') ?? null,
    done: state => (state.buildings.find(b => b.type === 'dock')?.workers ?? 0) >= BUILDINGS.dock.maxWorkers
  },
  {
    id: 'hut',
    hasTask: true,
    target: 'build-hut',
    done: state => housing(state) >= population(state)
  },
  {
    id: 'renderer',
    hasTask: true,
    subject: 'renderer',
    target: 'build-renderer',
    done: state => state.buildings.some(b => b.type === 'renderer' && b.workers > 0)
  },
  {
    id: 'goal',
    target: 'goal'
  },
  {
    id: 'forecast',
    target: 'forecast'
  },
  {
    id: 'modes',
    target: 'modes'
  },
  {
    id: 'fear',
    target: 'fear'
  },
  {
    id: 'alerts',
    target: 'alerts'
  },
  {
    id: 'done'
  }
];

const index = ref<number | null>(null);

function readDone () {
  try {
    return localStorage.getItem(DONE_KEY) === '1';
  } catch {
    return false;
  }
}

function saveDone () {
  try {
    localStorage.setItem(DONE_KEY, '1');
  } catch {
    // Without storage the tutorial simply offers itself again next visit.
  }
}

export function useTutorial () {
  const game = useGame();

  const step = computed(() => (index.value === null ? null : STEPS[index.value] ?? null));

  const progress = computed(() => ({ current: (index.value ?? 0) + 1, total: STEPS.length }));

  function start () {
    index.value = 0;
    game.setSpeed(0);
  }

  function finish () {
    index.value = null;
    game.view.highlight = null;
    saveDone();
    game.setSpeed(1);
  }

  function next () {
    if (index.value === null) {
      return;
    }

    // A finished task leaves its building open; closing it keeps the next step's focus clear.
    game.select(null);

    if (index.value >= STEPS.length - 1) {
      finish();
    } else {
      index.value++;
    }
  }

  function startIfNew () {
    if (index.value === null && !readDone()) {
      start();
    }
  }

  watch([step, game.state], ([current, state]) => {
    game.view.highlight = current?.spot?.(state) ?? null;

    if (current?.done?.(state)) {
      next();
    }
  });

  return { step, progress, start, next, finish, startIfNew };
}
