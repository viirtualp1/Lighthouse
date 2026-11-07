<script setup lang="ts">
import { computed } from 'vue';
import { Crosshair, RotateCcw, RotateCw, User } from '@lucide/vue';
import { BEAM_MODES, GAME } from '@/game/config';
import { lighthouseReach, oilPerHour } from '@/game/light';
import { forecast } from '@/game/sim';
import { useI18n } from 'vue-i18n';
import ResourceIcon from './ResourceIcon.vue';
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
    <header class="flex items-center justify-between">
      <h2 class="display text-3xl leading-none">
        {{ t('lighthouse.title') }}
      </h2>
      <span
        class="num flex items-center gap-1 text-[15px] text-warm"
        :title="t('lighthouse.oilPerHour')"
      >
        <ResourceIcon id="oil" />{{ oilPerHour(s).toFixed(1) }}{{ t('supplies.perHour') }}
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

    <ol
      class="flex h-14 items-end gap-1.5"
      data-tour="forecast"
    >
      <li
        v-for="n in nights"
        :key="n.day"
        class="flex flex-1 flex-col items-center gap-1"
        :title="t('lighthouse.forecast', { day: n.day, h: n.hours, oil: n.oil })"
      >
        <span
          class="num flex items-center gap-0.5 text-[11px]"
          :class="n.oil > s.resources.oil ? 'text-danger' : 'text-warm'"
        ><ResourceIcon
          id="oil"
          :size="10"
        />{{ n.oil }}</span>
        <div
          class="w-full rounded-[1px] border border-snow/25"
          :class="n.day === s.day ? 'bg-snow/80' : 'bg-snow/10'"
          :style="{ height: `${(n.hours / LONGEST_NIGHT) * 30 + 4}px` }"
        />
      </li>
    </ol>

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
        class="hud-btn h-8 px-3 whitespace-nowrap"
        :disabled="s.resources.iron < GAME.lensIron"
        :title="t('lighthouse.lensHint')"
        @click="game.buyLens()"
      >
        <ResourceIcon id="iron" />{{ t('lighthouse.lens', { n: GAME.lensIron }) }}
      </button>
    </div>
  </section>
</template>
