<script setup lang="ts">
import { computed } from 'vue';
import { TrendingDown, TrendingUp } from '@lucide/vue';
import { GAME } from '@/game/config';
import { fearRate } from '@/game/sim';
import type { LogEntry } from '@/game/state';
import { useI18n } from 'vue-i18n';
import { useGame } from './useGame';

const R = 46;
const FEED_SIZE = 4;
const FEED_FADE_HOURS = 10;

const TONES = {
  info: 'text-mist',
  warn: 'text-warm',
  bad: 'text-danger',
  good: 'text-good'
};

const game = useGame();
const { t } = useI18n();

const s = game.state;

const fear = computed(() => {
  const value = s.value.fear;
  let state = t('fear.calm');

  if (value >= GAME.fearDesertAt) {
    state = t('fear.flee');
  } else if (value >= GAME.fearStrikeAt) {
    state = t('fear.strike');
  } else if (value >= 30) {
    state = t('fear.uneasy');
  }

  return {
    value,
    state,
    rate: value >= GAME.fearLoseAt || (value <= 0 && fearRate(s.value) < 0) ? 0 : fearRate(s.value),
    arc: arc(0, value / 100),
    color: value >= GAME.fearDesertAt ? '#e0574a' : '#f2f4f5',
    ticks: [GAME.fearStrikeAt, GAME.fearDesertAt].map(t => tick(t / 100))
  };
});

const feed = computed(() => s.value.log.slice(0, FEED_SIZE).map(entry => ({
  ...entry,
  opacity: Math.max(0.25, 1 - (s.value.elapsed - entry.at) / FEED_FADE_HOURS)
})));

/** Building ids in log entries are translated too, so a language switch rewrites the whole feed. */
function logText (entry: LogEntry) {
  const params = { ...entry.params };

  if (typeof params.building === 'string') {
    params.building = t(`buildings.${params.building}.name`);
  }

  return t(entry.key, params);
}

function polar (t: number, r = R) {
  const a = Math.PI + t * Math.PI;

  return { x: Math.cos(a) * r, y: Math.sin(a) * r };
}

function arc (from: number, to: number) {
  const a = polar(from);
  const b = polar(Math.max(from + 0.001, to));

  return `M ${a.x} ${a.y} A ${R} ${R} 0 0 1 ${b.x} ${b.y}`;
}

function tick (t: number) {
  const a = polar(t, R - 9);
  const b = polar(t, R + 5);

  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
}
</script>

<template>
  <aside class="pointer-events-none absolute top-4 left-4 flex flex-col items-start gap-3">
    <section
      class="plate pointer-events-auto flex w-72 items-center gap-3 px-4 pt-3 pb-2"
      data-tour="fear"
      :title="t('fear.tooltip')"
    >
      <svg
        width="104"
        height="58"
        viewBox="-52 -52 104 58"
      >
        <path
          :d="arc(0, 1)"
          fill="none"
          stroke="rgba(242,244,245,0.12)"
          stroke-width="7"
        />
        <path
          :d="fear.arc"
          fill="none"
          :stroke="fear.color"
          stroke-width="7"
          class="transition-all duration-500"
        />
        <line
          v-for="(t, i) in fear.ticks"
          :key="i"
          v-bind="t"
          :stroke="i ? '#e0574a' : 'rgba(242,244,245,0.6)'"
          stroke-width="1.5"
        />
        <text
          y="2"
          text-anchor="middle"
          class="num"
          font-size="22"
          fill="#f2f4f5"
        >{{ Math.floor(fear.value) }}</text>
      </svg>
      <div>
        <div class="label">
          {{ t('fear.title') }}
        </div>
        <div
          class="display text-xl leading-tight"
          :class="fear.value >= GAME.fearDesertAt ? 'text-danger' : 'text-snow'"
        >
          {{ fear.state }}
        </div>
        <div
          v-if="Math.abs(fear.rate) >= 0.05"
          class="num mt-0.5 flex items-center gap-1 text-[12px]"
          :class="fear.rate > 0 ? 'text-danger' : 'text-good'"
        >
          <TrendingUp
            v-if="fear.rate > 0"
            :size="13"
          />
          <TrendingDown
            v-else
            :size="13"
          />
          {{ fear.rate > 0 ? t('fear.rising', { n: fear.rate.toFixed(1) }) : t('fear.falling', { n: Math.abs(fear.rate).toFixed(1) }) }}
        </div>
      </div>
    </section>

    <TransitionGroup
      tag="ul"
      class="flex flex-col gap-1"
      enter-from-class="opacity-0 -translate-x-3"
      enter-active-class="transition duration-300"
      leave-active-class="hidden"
    >
      <li
        v-for="entry in feed"
        :key="entry.id"
        class="rounded-sm bg-black/55 px-2.5 py-1 text-[13px] leading-snug whitespace-nowrap backdrop-blur-sm"
        :style="{ opacity: entry.opacity }"
      >
        <span class="num mr-1.5 text-[11px] text-fog">{{ entry.clock }}</span>
        <span :class="TONES[entry.tone]">{{ logText(entry) }}</span>
      </li>
    </TransitionGroup>
  </aside>
</template>
