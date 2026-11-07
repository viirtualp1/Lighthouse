<script setup lang="ts">
import { computed } from 'vue';
import { Minus, Plus, Trash, X } from '@lucide/vue';
import { BUILDINGS } from '@/game/config';
import { LIT, tonightRisk } from '@/game/light';
import { assignedWorkers, workFactor } from '@/game/sim';
import { useI18n } from 'vue-i18n';
import { useGame } from './useGame';

const game = useGame();
const { t } = useI18n();

const card = computed(() => {
  const s = game.state.value;
  const building = s.buildings.find(b => b.id === game.view.selectedId);

  if (!building) {
    return null;
  }

  const def = BUILDINGS[building.type];
  const factor = workFactor(s, building);
  const wreck = building.type === 'salvage' ? s.map.slots[building.slot]?.wreckIron ?? 0 : null;
  let status = { text: t('card.fullPower'), tone: 'text-good' };

  if (s.phase === 'day') {
    const risk = tonightRisk(s, building.x, building.y);

    if (risk.level !== LIT) {
      status = { text: t(risk.key), tone: risk.tone };
    }
  } else if (factor === 0) {
    status = { text: t('card.inShadow'), tone: 'text-danger' };
  } else if (factor < 1) {
    status = { text: t('card.dim'), tone: 'text-warm' };
  }

  return {
    building,
    def,
    status,
    wreck,
    free: s.healthy - assignedWorkers(s),
    slots: Array.from({ length: def.maxWorkers }, (_, i) => i < building.workers)
  };
});

function close () {
  game.view.selectedId = null;
}
</script>

<template>
  <section
    v-if="card"
    class="plate pointer-events-auto w-80 p-4"
    data-tour="building-card"
  >
    <header class="flex items-start justify-between gap-2">
      <div>
        <h2 class="display text-3xl leading-none">
          {{ t(`buildings.${card.building.type}.name`) }}
        </h2>
        <p class="mt-1 text-[13px] text-mist">
          {{ t(`buildings.${card.building.type}.hint`) }}
        </p>
      </div>
      <button
        class="hud-btn h-7 w-7 shrink-0 border-transparent"
        :aria-label="t('card.close')"
        @click="close"
      >
        <X :size="14" />
      </button>
    </header>

    <div
      v-if="card.def.maxWorkers"
      class="mt-4"
    >
      <div class="mb-2 flex items-baseline justify-between">
        <span class="label">{{ t('card.workers') }}</span>
        <span class="num text-[12px] text-mist">{{ t('card.free', { n: card.free }) }}</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="hud-btn h-8 w-8"
          @click="game.setWorkers(card.building.id, card.building.workers - 1)"
        >
          <Minus :size="13" />
        </button>
        <div class="flex flex-1 gap-1">
          <span
            v-for="(filled, i) in card.slots"
            :key="i"
            class="h-8 flex-1 border"
            :class="filled ? 'border-snow bg-snow' : 'border-snow/20 bg-snow/5'"
          />
        </div>
        <button
          class="hud-btn h-8 w-8"
          @click="game.setWorkers(card.building.id, card.building.workers + 1)"
        >
          <Plus :size="13" />
        </button>
      </div>
    </div>

    <p
      class="mt-3 text-[13px]"
      :class="card.status.tone"
    >
      {{ card.status.text }}
    </p>
    <p
      v-if="card.wreck !== null"
      class="mt-1 text-[13px] text-mist"
    >
      {{ t('card.wreckLeft', { n: Math.floor(card.wreck) }) }}
    </p>

    <button
      class="hud-btn mt-4 h-8 w-full text-danger"
      @click="game.demolish(card.building.id)"
    >
      <Trash :size="13" />{{ t('card.demolish') }}
    </button>
  </section>
</template>
