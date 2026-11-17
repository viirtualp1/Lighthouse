<template>
  <Transition
    enter-from-class="opacity-0"
    enter-active-class="transition duration-1000"
  >
    <div
      v-if="s.status !== 'playing'"
      class="pointer-events-auto absolute inset-0 z-30 grid place-items-center bg-black/80"
    >
      <section class="max-w-md text-center">
        <div class="font-hud text-[11px] font-medium tracking-[0.12em] text-mist uppercase">
          {{ t('end.day', { n: Math.min(s.day, GAME.daysToWin) }) }}
        </div>
        <h2
          class="mt-2 font-display text-7xl font-semibold"
          :class="s.status === 'won' ? 'text-warm' : 'text-snow'"
        >
          {{ s.status === 'won' ? t('end.won') : t('end.lost') }}
        </h2>
        <p class="mt-4 text-mist">
          {{ s.endReason ? t(s.endReason.key, s.endReason.params) : '' }}
        </p>
        <button
          class="mt-8 inline-flex h-11 w-56 hud-btn items-center justify-center gap-1.5 text-sm"
          data-primary
          @click="game.restart()"
        >
          {{ t('end.restart') }}
        </button>
      </section>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { GAME } from '@/game/config';
import { useGame } from './useGame';

const game = useGame();
const { t } = useI18n();

const s = game.state;
</script>
