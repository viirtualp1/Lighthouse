<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGame } from './useGame';
import { useTutorial } from './useTutorial';

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

const PAD = 8;

let frame = 0;

const game = useGame();
const tutorial = useTutorial();
const { t } = useI18n();

const spotlight = ref<Rect | null>(null);

const step = computed(() => (game.menuOpen.value ? null : tutorial.step.value));

function track () {
  const target = step.value?.target;
  const element = target ? document.querySelector(`[data-tour="${target}"]`) : null;

  if (element) {
    const r = element.getBoundingClientRect();
    spotlight.value = { left: r.left - PAD, top: r.top - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 };
  } else {
    spotlight.value = null;
  }

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
  <div
    v-if="spotlight"
    class="pointer-events-none fixed z-40 rounded-[4px] border-2 border-warm shadow-[0_0_0_9999px_rgba(0,0,0,0.35),0_0_30px_rgba(255,233,196,0.45)] transition-all duration-300"
    :style="{ left: `${spotlight.left}px`, top: `${spotlight.top}px`, width: `${spotlight.width}px`, height: `${spotlight.height}px` }"
  >
    <div class="absolute inset-0 animate-pulse rounded-[4px] border border-warm/60" />
  </div>

  <Transition
    enter-from-class="opacity-0 translate-y-2"
    enter-active-class="transition duration-300"
    mode="out-in"
  >
    <section
      v-if="step"
      :key="step.id"
      class="plate pointer-events-auto fixed top-1/2 right-6 z-50 w-[440px] -translate-y-1/2 px-6 py-5"
      :class="{ 'right-1/2! translate-x-1/2': tutorial.progress.value.current === 1 }"
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
