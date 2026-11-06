<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGame } from './useGame';
import type { Banner } from './useGame';

const SHOW_MS = 3200;

let timer: ReturnType<typeof setTimeout> | null = null;

const game = useGame();
const { t } = useI18n();

const shown = ref<Banner | null>(null);

watch(game.banner, banner => {
  shown.value = banner;

  if (timer) {
    clearTimeout(timer);
  }

  timer = setTimeout(() => {
    shown.value = null;
  }, SHOW_MS);
});

onBeforeUnmount(() => {
  if (timer) {
    clearTimeout(timer);
  }
});
</script>

<template>
  <Transition
    enter-from-class="opacity-0 scale-95"
    enter-active-class="transition duration-700"
    leave-to-class="opacity-0"
    leave-active-class="transition duration-1000"
  >
    <div
      v-if="shown"
      :key="shown.id"
      class="pointer-events-none absolute top-[30%] left-1/2 z-10 -translate-x-1/2 text-center"
    >
      <div class="mx-auto mb-3 h-px w-40 bg-gradient-to-r from-transparent via-snow/70 to-transparent" />
      <h2 class="display text-7xl tracking-wide text-snow drop-shadow-[0_4px_20px_rgba(0,0,0,0.9)]">
        {{ t(shown.title.key, shown.title.params) }}
      </h2>
      <p class="label mt-2 text-[13px] text-snow/80">
        {{ t(shown.subtitle.key, shown.subtitle.params) }}
      </p>
      <div class="mx-auto mt-3 h-px w-40 bg-gradient-to-r from-transparent via-snow/70 to-transparent" />
    </div>
  </Transition>
</template>
