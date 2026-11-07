<script setup lang="ts">
import { computed, ref } from 'vue';
import { BedDouble, HeartPulse, Users } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { RESOURCE_IDS } from '@/game/config';
import { assignedWorkers, housing, population, rateBreakdown, rates } from '@/game/sim';
import ResourceIcon from './ResourceIcon.vue';
import { useGame } from './useGame';
import type { Component } from 'vue';
import type { ResourceId } from '@/game/config';

interface PeopleRow {
  id: string;
  name: string;
  icon: Component;
  value: number;
  note: string;
  tone: string;
  iconTone: string;
}

const game = useGame();
const { t } = useI18n();

const s = game.state;

const hovered = ref<ResourceId | null>(null);

const resources = computed(() => {
  const perHour = rates(s.value);

  return RESOURCE_IDS.map(id => ({
    id,
    name: t(`resources.${id}`),
    value: Math.floor(s.value.resources[id]),
    note: formatRate(perHour[id]),
    tone: perHour[id] < -0.05 ? 'text-danger' : 'text-good'
  }));
});

/** The hovered resource's sources and drains, so a falling number can be traced to the building behind it. */
const breakdown = computed(() => {
  if (!hovered.value) {
    return null;
  }

  const rows = rateBreakdown(s.value)[hovered.value].map(row => ({
    name: row.source === 'beam' ? t('supplies.sourceBeam') : row.source === 'lanterns' ? t('supplies.sourceLanterns') : t(`buildings.${row.source}.name`),
    amount: row.amount
  }));

  const eaten = hovered.value === 'fish' ? population(s.value) : 0;

  return { id: hovered.value, rows, eaten };
});

const people = computed<PeopleRow[]>(() => {
  const total = population(s.value);
  const beds = housing(s.value);
  const idle = s.value.healthy - assignedWorkers(s.value);

  return [
    { id: 'people', name: t('supplies.people'), icon: Users, value: total, note: idle ? t('supplies.idle', { n: idle }) : '', tone: 'text-mist', iconTone: 'text-mist' },
    {
      id: 'beds',
      name: t('supplies.beds'),
      icon: BedDouble,
      value: beds,
      note: beds < total ? t('supplies.outside', { n: total - beds }) : '',
      tone: 'text-danger',
      iconTone: beds < total ? 'text-danger' : 'text-mist'
    },
    { id: 'sick', name: t('supplies.sick'), icon: HeartPulse, value: s.value.sick, note: '', tone: 'text-mist', iconTone: s.value.sick ? 'text-danger' : 'text-fog' }
  ];
});

function formatRate (rate: number) {
  if (Math.abs(rate) < 0.05) {
    return '';
  }

  return `${rate > 0 ? '+' : '−'}${Math.abs(rate).toFixed(1)}${t('supplies.perHour')}`;
}
</script>

<template>
  <section class="plate pointer-events-auto relative w-80 p-4">
    <div
      v-if="breakdown"
      class="plate absolute right-full top-0 mr-2 w-64 px-4 py-3 whitespace-nowrap"
    >
      <div class="mb-2 flex items-center gap-2">
        <ResourceIcon
          :id="breakdown.id"
          :size="16"
        />
        <span class="display text-xl leading-none">{{ t(`resources.${breakdown.id}`) }}</span>
      </div>
      <ul class="space-y-1">
        <li
          v-for="row in breakdown.rows"
          :key="row.name"
          class="flex justify-between gap-4 text-[13px]"
        >
          <span class="text-mist">{{ row.name }}</span>
          <span
            class="num"
            :class="row.amount < 0 ? 'text-danger' : 'text-good'"
          >{{ formatRate(row.amount) }}</span>
        </li>
        <li
          v-if="breakdown.eaten"
          class="flex justify-between gap-4 border-t border-snow/10 pt-1 text-[13px]"
        >
          <span class="text-mist">{{ t('supplies.eaten') }}</span>
          <span class="num text-danger">−{{ breakdown.eaten }}</span>
        </li>
        <li
          v-if="!breakdown.rows.length && !breakdown.eaten"
          class="text-[13px] text-fog"
        >
          {{ t('supplies.steady') }}
        </li>
      </ul>
    </div>

    <div class="label mb-2">
      {{ t('supplies.title') }}
    </div>
    <ul class="space-y-1">
      <li
        v-for="row in resources"
        :key="row.id"
        class="-mx-2 flex cursor-default items-center gap-3 rounded-[2px] px-2 py-0.5 whitespace-nowrap transition-colors hover:bg-snow/5"
        @mouseenter="hovered = row.id"
        @mouseleave="hovered = null"
      >
        <ResourceIcon
          :id="row.id"
          :size="19"
        />
        <span class="flex-1 text-[15px] text-mist">{{ row.name }}</span>
        <span
          class="num text-[13px]"
          :class="row.tone"
        >{{ row.note }}</span>
        <span class="num w-12 text-right text-2xl leading-none">{{ row.value }}</span>
      </li>
    </ul>

    <div class="label mt-4 mb-2 border-t border-snow/10 pt-3">
      {{ t('supplies.town') }}
    </div>
    <ul class="space-y-2">
      <li
        v-for="row in people"
        :key="row.id"
        class="flex items-center gap-3 whitespace-nowrap"
      >
        <component
          :is="row.icon"
          :size="19"
          :stroke-width="1.6"
          :class="row.iconTone"
        />
        <span class="flex-1 text-[15px] text-mist">{{ row.name }}</span>
        <span
          class="num text-[13px]"
          :class="row.tone"
        >{{ row.note }}</span>
        <span class="num w-12 text-right text-2xl leading-none">{{ row.value }}</span>
      </li>
    </ul>
  </section>
</template>
