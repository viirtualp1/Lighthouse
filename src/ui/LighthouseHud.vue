<script setup lang="ts">
import { computed } from 'vue';
import { Crosshair, Minus, Plus, RotateCcw, RotateCw } from '@lucide/vue';
import { BEAM_MODES, GAME } from '@/game/config';
import { lighthouseReach, oilPerHour } from '@/game/light';
import { forecast } from '@/game/sim';
import { useI18n } from 'vue-i18n';
import { useGame } from './useGame';
import type { BeamMode } from '@/game/config';

const MODES = Object.entries(BEAM_MODES) as [BeamMode, (typeof BEAM_MODES)[BeamMode]][];
const LONGEST_NIGHT = 20;

const game = useGame();
const { t } = useI18n();

const s = game.state;

const keepers = computed(() => s.value.buildings.find(b => b.type === 'lighthouse')!);

const nights = computed(() => forecast(s.value, 5));
</script>

<template>
  <section class="plate pointer-events-auto absolute bottom-4 left-4 flex w-80 flex-col gap-3 p-4">
    <header class="flex items-baseline justify-between">
      <h2 class="display text-3xl leading-none">
        {{ t('lighthouse.title') }}
      </h2>
      <span class="label">
        <span class="num text-warm">{{ oilPerHour(s).toFixed(1) }}</span> {{ t('lighthouse.oilPerHour') }}
      </span>
    </header>

    <div
      class="grid grid-cols-4 gap-1"
      data-tour="modes"
    >
      <button
        v-for="[id, mode] in MODES"
        :key="id"
        class="hud-btn h-9"
        :class="{ on: s.mode === id }"
        :title="`${t(`modes.${id}.hint`)} · ${mode.oilPerHour} ${t('lighthouse.oilPerHour')}`"
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
      <div class="label mb-1.5">
        {{ t('lighthouse.nightsAhead') }}
      </div>
      <ol class="flex h-16 items-end gap-1.5">
        <li
          v-for="n in nights"
          :key="n.day"
          class="flex flex-1 flex-col items-center gap-1"
          :title="t('lighthouse.forecast', { day: n.day, h: n.hours, oil: n.oil })"
        >
          <span
            class="num text-[10px]"
            :class="n.oil > s.resources.oil ? 'text-danger' : 'text-warm'"
          >{{ n.oil }}</span>
          <div
            class="w-full rounded-[1px] border border-snow/25"
            :class="n.day === s.day ? 'bg-snow/80' : 'bg-snow/10'"
            :style="{ height: `${(n.hours / LONGEST_NIGHT) * 34 + 4}px` }"
          />
        </li>
      </ol>
      <div class="mt-1 flex gap-1.5">
        <span
          v-for="n in nights"
          :key="n.day"
          class="num flex-1 text-center text-[10px] text-fog"
        >{{ t('dawn.hours', { h: n.hours }) }}</span>
      </div>
    </div>

    <div class="flex items-center justify-between border-t border-snow/10 pt-3">
      <div>
        <div class="label">
          {{ t('lighthouse.keepers') }}
        </div>
        <div
          class="text-[12px]"
          :class="lighthouseReach(s) < 1 ? 'text-danger' : 'text-mist'"
        >
          {{ lighthouseReach(s) < 1 ? t('lighthouse.reachShort') : t('lighthouse.reachFull') }}
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button
          class="hud-btn h-7 w-7"
          @click="game.setWorkers(keepers.id, keepers.workers - 1)"
        >
          <Minus :size="12" />
        </button>
        <span class="num w-8 text-center text-lg">{{ keepers.workers }}/2</span>
        <button
          class="hud-btn h-7 w-7"
          @click="game.setWorkers(keepers.id, keepers.workers + 1)"
        >
          <Plus :size="12" />
        </button>
      </div>
    </div>

    <button
      v-if="!s.lens"
      class="hud-btn h-9"
      :disabled="s.resources.iron < GAME.lensIron"
      :title="t('lighthouse.lensHint')"
      @click="game.buyLens()"
    >
      {{ t('lighthouse.lens', { n: GAME.lensIron }) }}
    </button>
  </section>
</template>
