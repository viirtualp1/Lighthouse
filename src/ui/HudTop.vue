<script setup lang="ts">
import { computed } from 'vue';
import { Pause, Play } from '@lucide/vue';
import { GAME } from '@/game/config';
import { clockOf, nightHours } from '@/game/sim';
import { useI18n } from 'vue-i18n';
import { useGame } from './useGame';

const SPEEDS = [1, 2, 3];
const DIAL = 30;

const game = useGame();
const { t } = useI18n();

const s = game.state;

const dial = computed(() => {
  const nightStart = 24 - nightHours(s.value);

  return {
    night: arc(nightStart, 24),
    dusk: arc(nightStart - GAME.duskHours, nightStart),
    hand: point(s.value.hour, DIAL - 3)
  };
});

const untilNight = computed(() => {
  const nightStart = 24 - nightHours(s.value);

  if (s.value.phase === 'night') {
    return t('top.untilDawn', { h: Math.ceil(24 - s.value.hour) });
  }

  return t('top.untilNight', { h: Math.max(0, Math.ceil(nightStart - s.value.hour)) });
});

function point (hour: number, r: number) {
  const a = (hour / 24) * Math.PI * 2 - Math.PI / 2;

  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

function arc (from: number, to: number) {
  const a = point(from, DIAL);
  const b = point(to, DIAL);
  const large = to - from > 12 ? 1 : 0;

  return `M 0 0 L ${a.x} ${a.y} A ${DIAL} ${DIAL} 0 ${large} 1 ${b.x} ${b.y} Z`;
}
</script>

<template>
  <header class="plate pointer-events-auto absolute top-4 left-1/2 flex -translate-x-1/2 items-center gap-4 px-3 py-2.5">
    <svg
      :width="DIAL * 2 + 6"
      :height="DIAL * 2 + 6"
      :viewBox="`${-DIAL - 3} ${-DIAL - 3} ${DIAL * 2 + 6} ${DIAL * 2 + 6}`"
      data-tour="clock"
    >
      <title>{{ t('top.clock') }}</title>
      <circle
        :r="DIAL"
        fill="rgba(242,244,245,0.04)"
        stroke="rgba(242,244,245,0.3)"
      />
      <path
        :d="dial.dusk"
        fill="rgba(242,244,245,0.1)"
      />
      <path
        :d="dial.night"
        fill="#000"
        stroke="rgba(242,244,245,0.25)"
        stroke-width="0.5"
      />
      <line
        v-for="h in 24"
        :key="h"
        :x1="point(h, DIAL - (h % 6 === 0 ? 6 : 2.5)).x"
        :y1="point(h, DIAL - (h % 6 === 0 ? 6 : 2.5)).y"
        :x2="point(h, DIAL).x"
        :y2="point(h, DIAL).y"
        stroke="rgba(242,244,245,0.45)"
      />
      <line
        x1="0"
        y1="0"
        :x2="dial.hand.x"
        :y2="dial.hand.y"
        stroke="#ffe9c4"
        stroke-width="2"
        stroke-linecap="round"
      />
      <circle
        r="2.5"
        fill="#ffe9c4"
      />
    </svg>

    <div class="flex flex-col gap-1 whitespace-nowrap">
      <div class="flex items-baseline gap-2.5">
        <span class="num text-2xl leading-none">{{ clockOf(s.hour) }}</span>
        <span class="display text-xl leading-none">{{ t(`phase.${s.phase}`) }} {{ Math.min(s.day, GAME.daysToWin) }}</span>
        <span class="label">{{ t('top.of', { total: GAME.daysToWin }) }}</span>
      </div>
      <span class="label text-[10px]">{{ untilNight }} · {{ t('top.nightLength', { h: nightHours(s) }) }}</span>
    </div>

    <div class="h-10 w-px bg-snow/15" />

    <div class="flex gap-1">
      <button
        class="hud-btn h-8 w-8"
        :class="{ on: s.speed === 0 }"
        :title="t('top.pause')"
        @click="game.togglePause()"
      >
        <Play
          v-if="s.speed === 0"
          :size="13"
        />
        <Pause
          v-else
          :size="13"
        />
      </button>
      <button
        v-for="speed in SPEEDS"
        :key="speed"
        class="hud-btn h-8 w-9"
        :class="{ on: s.speed === speed }"
        :title="t('top.speed', { n: speed })"
        @click="game.setSpeed(speed)"
      >
        ×{{ speed }}
      </button>
    </div>
  </header>
</template>
