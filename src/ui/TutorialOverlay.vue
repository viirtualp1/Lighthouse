<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGame } from './useGame';
import { useTutorial } from './useTutorial';

interface Focus {
  left: number;
  top: number;
  width: number;
  height: number;
  round: boolean;
}

const PAD = 8;
const CARD_WIDTH = 440;
const CARD_GAP = 24;
const EDGE = 16;
const SPOT_RADIUS = 70;
const TOP_BAR = 104;

let frame = 0;

const game = useGame();
const tutorial = useTutorial();
const { t } = useI18n();

const focus = ref<Focus | null>(null);
const viewport = ref({ width: window.innerWidth, height: window.innerHeight });

const step = computed(() => (game.menuOpen.value ? null : tutorial.step.value));

/** While the player places a building or aims the beam they need the whole map, so the dimming steps aside. */
const dimmed = computed(() => !!step.value && !game.view.placing && !game.view.aiming);

/**
 * The card sits beside what it talks about: below things in the upper half of the screen, above the rest, and in the
 * middle when it points at nothing. That way it never covers the element the player has to use.
 */
const cardStyle = computed(() => {
  const f = focus.value;
  const { width, height } = viewport.value;

  if (!f) {
    return dimmed.value
      ? { left: `${(width - CARD_WIDTH) / 2}px`, top: '50%', transform: 'translateY(-50%)' }
      : { left: `${(width - CARD_WIDTH) / 2}px`, top: `${TOP_BAR}px` };
  }

  const centerX = f.left + f.width / 2;
  const left = Math.min(width - CARD_WIDTH - EDGE, Math.max(EDGE, centerX - CARD_WIDTH / 2));

  if (f.top + f.height / 2 < height * 0.45) {
    return { left: `${left}px`, top: `${f.top + f.height + CARD_GAP}px` };
  }

  return { left: `${left}px`, bottom: `${height - f.top + CARD_GAP}px` };
});

function elementFocus (name: string): Focus | null {
  const element = document.querySelector(`[data-tour="${name}"]`);

  if (!element) {
    return null;
  }

  const r = element.getBoundingClientRect();

  return { left: r.left - PAD, top: r.top - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2, round: false };
}

function spotFocus (): Focus | null {
  const spot = step.value?.spot?.(game.state.value);
  const project = game.projector.value;

  if (!spot || !project) {
    return null;
  }

  const p = project(spot);
  const r = Math.max(48, SPOT_RADIUS * p.scale);

  return { left: p.x - r, top: p.y - r, width: r * 2, height: r * 2, round: true };
}

/** A task step follows the player: once they open the building it is about, the focus moves to its card. */
function currentFocus () {
  const current = step.value;

  if (!current || !dimmed.value) {
    return null;
  }

  const selected = game.state.value.buildings.find(b => b.id === game.view.selectedId);

  if (current.subject && selected?.type === current.subject) {
    const card = elementFocus('building-card');

    if (card) {
      return card;
    }
  }

  return (current.target ? elementFocus(current.target) : null) ?? spotFocus();
}

function track () {
  focus.value = currentFocus();
  viewport.value = { width: window.innerWidth, height: window.innerHeight };
  frame = requestAnimationFrame(track);
}

onMounted(() => {
  tutorial.startIfNew();
  frame = requestAnimationFrame(track);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
});
</script>

<template>
  <Transition
    enter-from-class="opacity-0"
    enter-active-class="transition duration-300"
    leave-to-class="opacity-0"
    leave-active-class="transition duration-300"
  >
    <div
      v-if="dimmed && !focus"
      class="pointer-events-none fixed inset-0 z-40 bg-black/70"
    />
  </Transition>

  <div
    v-if="dimmed && focus"
    class="pointer-events-none fixed z-40 border-2 border-warm shadow-[0_0_0_9999px_rgba(0,0,0,0.7),0_0_30px_rgba(255,233,196,0.45)] transition-all duration-300"
    :class="focus.round ? 'rounded-full' : 'rounded-[4px]'"
    :style="{ left: `${focus.left}px`, top: `${focus.top}px`, width: `${focus.width}px`, height: `${focus.height}px` }"
  >
    <div
      class="absolute inset-0 animate-pulse border border-warm/60"
      :class="focus.round ? 'rounded-full' : 'rounded-[4px]'"
    />
  </div>

  <Transition
    enter-from-class="opacity-0 translate-y-2"
    enter-active-class="transition duration-300"
    mode="out-in"
  >
    <section
      v-if="step"
      :key="step.id"
      class="plate pointer-events-auto fixed z-50 px-6 py-5 transition-[left,top,bottom] duration-300"
      :style="{ ...cardStyle, width: `${CARD_WIDTH}px` }"
    >
      <div class="label">
        {{ t('tutorial.label', { n: tutorial.progress.value.current, total: tutorial.progress.value.total }) }}
      </div>
      <h2 class="display mt-1 text-4xl leading-none">
        {{ t(`tutorial.steps.${step.id}.title`) }}
      </h2>
      <p class="mt-3 text-[16px] leading-relaxed text-snow/90">
        {{ t(`tutorial.steps.${step.id}.text`) }}
      </p>
      <p
        v-if="step.hasTask"
        class="mt-4 flex items-center gap-2 border-l-2 border-warm pl-3 text-[15px] text-warm"
      >
        {{ t(`tutorial.steps.${step.id}.task`) }}
      </p>

      <div class="mt-5 flex items-center justify-between gap-3">
        <button
          class="hud-btn h-10 border-transparent px-3 text-mist"
          @click="tutorial.finish()"
        >
          {{ t('tutorial.skip') }}
        </button>
        <button
          v-if="!step.done"
          class="hud-btn on h-10 px-6 text-sm"
          @click="tutorial.next()"
        >
          {{ tutorial.progress.value.current === tutorial.progress.value.total ? t('tutorial.play') : t('tutorial.next') }}
        </button>
        <span
          v-else
          class="label animate-pulse text-warm"
        >{{ t('tutorial.waiting') }}</span>
      </div>
    </section>
  </Transition>
</template>
