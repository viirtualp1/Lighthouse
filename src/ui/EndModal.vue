<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { GAME } from '@/game/config';
import { useGame } from './useGame';

const game = useGame();
const { t } = useI18n();

const s = game.state;
</script>

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
        <div class="label">
          {{ t('end.day', { n: Math.min(s.day, GAME.daysToWin) }) }}
        </div>
        <h2
          class="display mt-2 text-7xl"
          :class="s.status === 'won' ? 'text-warm' : 'text-snow'"
        >
          {{ s.status === 'won' ? t('end.won') : t('end.lost') }}
        </h2>
        <p class="mt-4 text-mist">
          {{ s.endReason ? t(s.endReason.key, s.endReason.params) : '' }}
        </p>
        <button
          class="hud-btn on mt-8 h-11 w-56 text-sm"
          @click="game.restart()"
        >
          {{ t('end.restart') }}
        </button>
      </section>
    </div>
  </Transition>
</template>
