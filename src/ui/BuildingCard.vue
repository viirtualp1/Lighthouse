<script setup lang="ts">
import { computed } from 'vue';
import { Minus, Plus, Trash, User, X } from '@lucide/vue';
import { BUILDINGS } from '@/game/config';
import { LIT, tonightRisk } from '@/game/light';
import { assignedWorkers, efficiency, workFactor } from '@/game/sim';
import { useI18n } from 'vue-i18n';
import ResourceIcon from './ResourceIcon.vue';
import { useGame } from './useGame';
import type { ResourceId } from '@/game/config';

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

  const eff = efficiency(s, building);
  const work = building.workers * eff.total;
  const outputs: { id: ResourceId; amount: number }[] = [];
  let note: string | null = null;

  if (building.type === 'dock') {
    outputs.push({ id: 'fish', amount: work });
  } else if (building.type === 'driftwood') {
    outputs.push({ id: 'wood', amount: work });
  } else if (building.type === 'oilCollector') {
    outputs.push({ id: 'oil', amount: work * 0.5 });
  } else if (building.type === 'renderer') {
    outputs.push({ id: 'oil', amount: work }, { id: 'fish', amount: -work * 2 });
  } else if (building.type === 'salvage') {
    outputs.push({ id: 'iron', amount: (wreck ?? 0) > 0 ? work * 0.5 : 0 });
  } else if (building.type === 'hut') {
    note = t('card.houses', { n: def.housing ?? 0 });
  } else if (building.type === 'infirmary') {
    note = t('card.healing', { n: s.sick });
  } else if (building.type === 'chapel') {
    note = building.workers ? t('card.calming') : t('card.calmingIdle');
  }

  if (def.maxWorkers && building.workers === 0 && building.type !== 'chapel') {
    note = t('card.nothing');
  }

  return {
    building,
    def,
    status,
    wreck,
    outputs: building.workers ? outputs : [],
    note,
    eff: { total: Math.round(eff.total * 100), light: Math.round(eff.light * 100), fear: Math.round((1 - eff.fear) * 100) },
    free: s.healthy - assignedWorkers(s),
    slots: Array.from({ length: def.maxWorkers }, (_, i) => i < building.workers)
  };
});

function close () {
  game.view.selectedId = null;
}

/** Clicking a worker figure fills up to it; clicking the last filled one empties it. */
function setTo (index: number) {
  const current = card.value;

  if (!current) {
    return;
  }

  const target = current.building.workers === index + 1 ? index : index + 1;
  game.setWorkers(current.building.id, target);
}

function formatAmount (amount: number) {
  return `${amount >= 0 ? '+' : '−'}${Math.abs(amount).toFixed(1)}`;
}
</script>

<template>
  <section
    v-if="card"
    class="plate pointer-events-auto w-80 p-4"
    data-tour="building-card"
  >
    <header class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <h2 class="display text-3xl leading-none">
          {{ t(`buildings.${card.building.type}.name`) }}
        </h2>
        <p class="mt-1 text-[13px] text-mist">
          {{ t(`buildings.${card.building.type}.hint`) }}
        </p>
      </div>
      <button
        class="hud-btn h-7 w-7 shrink-0 border-transparent text-mist hover:text-danger"
        :title="t('card.demolish')"
        :aria-label="t('card.demolish')"
        @click="game.demolish(card.building.id)"
      >
        <Trash :size="14" />
      </button>
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
      class="mt-4 flex items-center gap-2"
    >
      <button
        class="hud-btn h-8 w-8"
        @click="game.setWorkers(card.building.id, card.building.workers - 1)"
      >
        <Minus :size="13" />
      </button>
      <div
        class="flex flex-1 justify-center gap-0.5"
        :title="t('card.free', { n: card.free })"
      >
        <button
          v-for="(filled, i) in card.slots"
          :key="i"
          class="grid h-8 w-8 cursor-pointer place-items-center rounded-[2px] transition-colors hover:bg-snow/10"
          @click="setTo(i)"
        >
          <User
            :size="20"
            :stroke-width="1.6"
            :class="filled ? 'fill-snow text-snow' : 'text-snow/30'"
          />
        </button>
      </div>
      <button
        class="hud-btn h-8 w-8"
        :disabled="card.free <= 0"
        @click="game.setWorkers(card.building.id, card.building.workers + 1)"
      >
        <Plus :size="13" />
      </button>
    </div>

    <div
      v-if="card.outputs.length"
      class="mt-4 flex items-center gap-4 border-t border-snow/10 pt-3"
    >
      <span
        v-for="o in card.outputs"
        :key="o.id"
        class="num flex items-center gap-1.5 text-[16px]"
        :class="o.amount < 0 ? 'text-danger' : 'text-snow'"
      >
        <ResourceIcon
          :id="o.id"
          :size="16"
        />{{ formatAmount(o.amount) }}{{ t('supplies.perHour') }}
      </span>
      <span
        v-if="card.eff.total < 100"
        class="num ml-auto text-[13px] text-warm"
        :title="`${t('card.efficiency')} · ${t('card.effLight')} ${card.eff.light}%${card.eff.fear ? ` · ${t('card.effFear')} −${card.eff.fear}%` : ''}`"
      >{{ card.eff.total }}%</span>
    </div>
    <p
      v-if="card.note"
      class="mt-3 text-[13px] text-mist"
    >
      {{ card.note }}
    </p>
    <p
      v-if="card.wreck !== null"
      class="mt-2 flex items-center gap-1.5 text-[13px] text-mist"
    >
      <ResourceIcon id="iron" />{{ t('card.wreckLeft', { n: Math.floor(card.wreck) }) }}
    </p>
    <p
      v-if="card.status.tone !== 'text-good'"
      class="mt-3 text-[13px]"
      :class="card.status.tone"
    >
      {{ card.status.text }}
    </p>
  </section>
</template>
