<script setup lang="ts">
import { computed } from 'vue';
import { Crosshair, RotateCcw, RotateCw, User } from '@lucide/vue';
import { BEAM_MODES, GAME } from '@/game/config';
import { lighthouseReach } from '@/game/light';
import { forecast } from '@/game/sim';
import { useI18n } from 'vue-i18n';
import ResourceIcon from './ResourceIcon.vue';
import { useGame } from './useGame';
import type { BeamMode } from '@/game/config';

const MODES = Object.entries(BEAM_MODES) as [BeamMode, (typeof BEAM_MODES)[BeamMode]][];

const game = useGame();
const { t } = useI18n();

const s = game.state;

const keepers = computed(() => s.value.buildings.find(b => b.type === 'lighthouse')!);

/**
 * How many of the coming nights the oil in store will carry the Lighthouse through, one segment per night, the
 * first segment being tonight. A part-filled segment is a night the oil runs out in.
 */
const supply = computed(() => {
  let left = s.value.resources.oil;

  const nights = forecast(s.value, 5).map(n => {
    const share = Math.max(0, Math.min(1, left / Math.max(1, n.oil)));
    left -= n.oil;

    return { ...n, share };
  });

  return { nights, covered: nights.filter(n => n.share >= 1).length };
});
</script>

<template>
  <section class="plate pointer-events-auto absolute bottom-4 left-4 flex w-80 flex-col gap-3 p-4">
    <h2 class="display text-3xl leading-none">
      {{ t('lighthouse.title') }}
    </h2>

    <div
      class="grid grid-cols-4 gap-1"
      data-tour="modes"
    >
      <button
        v-for="[id, mode] in MODES"
        :key="id"
        class="hud-btn h-9"
        :class="{ on: s.mode === id }"
        :title="`${t(`modes.${id}.hint`)} · ${mode.oilPerHour}${t('supplies.perHour')}`"
        @click="game.setMode(id)"
      >
        {{ t(`modes.${id}.name`) }}
      </button>
    </div>

    <div
      v-if="s.mode === 'beam'"
      class="flex gap-1"
    >
      <button
        class="hud-btn h-8 flex-1"
        :class="{ on: game.view.aiming }"
        @click="game.startAiming()"
      >
        <Crosshair :size="14" />{{ t('lighthouse.aim') }}
      </button>
      <button
        class="hud-btn h-8 w-9"
        :title="t('lighthouse.rotateLeft')"
        @click="game.rotateBeam(-1)"
      >
        <RotateCcw :size="14" />
      </button>
      <button
        class="hud-btn h-8 w-9"
        :title="t('lighthouse.rotateRight')"
        @click="game.rotateBeam(1)"
      >
        <RotateCw :size="14" />
      </button>
    </div>

    <div data-tour="forecast">
      <p
        class="flex items-center gap-1.5 text-[14px]"
        :class="supply.covered === 0 ? 'text-danger' : 'text-snow'"
      >
        <ResourceIcon id="oil" />
        {{ supply.covered === supply.nights.length
          ? t('lighthouse.lasts', { n: `${supply.covered}+` }, supply.covered)
          : t('lighthouse.lasts', { n: supply.covered }, supply.covered) }}
      </p>
      <ol class="mt-2 flex gap-1">
        <li
          v-for="n in supply.nights"
          :key="n.day"
          class="relative h-2 flex-1 overflow-hidden rounded-[1px] border"
          :class="n.share > 0 ? 'border-warm/50' : 'border-danger/60'"
          :title="t('lighthouse.forecast', { day: n.day, h: n.hours, oil: n.oil })"
        >
          <div
            class="h-full bg-warm"
            :style="{ width: `${n.share * 100}%` }"
          />
        </li>
      </ol>
    </div>

    <div class="flex items-center justify-between gap-3 border-t border-snow/10 pt-3">
      <div
        class="flex items-center gap-0.5"
        :title="t('lighthouse.keepers')"
      >
        <button
          v-for="i in 2"
          :key="i"
          class="grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] transition-colors hover:bg-snow/10"
          @click="game.setWorkers(keepers.id, keepers.workers === i ? i - 1 : i)"
        >
          <User
            :size="20"
            :stroke-width="1.6"
            :class="i <= keepers.workers ? 'fill-snow text-snow' : 'text-danger'"
          />
        </button>
        <span
          v-if="lighthouseReach(s) < 1"
          class="ml-1 text-[12px] whitespace-nowrap text-danger"
        >{{ t('lighthouse.reachShort') }}</span>
      </div>
      <button
        v-if="!s.lens"
        class="hud-btn h-auto flex-col items-start gap-0 px-3 py-1.5 text-left whitespace-nowrap normal-case tracking-normal"
        :class="{ 'opacity-60': s.resources.iron < GAME.lensIron }"
        @mouseenter="game.view.previewLens = true"
        @mouseleave="game.view.previewLens = false"
        @click="s.resources.iron >= GAME.lensIron && game.buyLens()"
      >
        <span class="flex items-center gap-1.5 text-[13px] font-medium uppercase tracking-[0.08em]">
          {{ t('lighthouse.lensName') }}
          <span
            class="num flex items-center gap-0.5 normal-case"
            :class="s.resources.iron < GAME.lensIron ? 'text-danger' : 'text-snow'"
          ><ResourceIcon id="iron" />{{ GAME.lensIron }}</span>
        </span>
        <span class="text-[11px] text-mist">{{ t('lighthouse.lensGain') }}</span>
        <span
          v-if="s.resources.iron < GAME.lensIron"
          class="text-[11px] text-danger"
        >{{ t('lighthouse.lensWhere') }}</span>
      </button>
    </div>
  </section>
</template>
