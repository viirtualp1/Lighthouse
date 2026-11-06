<script setup lang="ts">
import { computed } from 'vue';
import { Anvil, BedDouble, Droplet, Fish, HeartPulse, TreePine, Users } from '@lucide/vue';
import { RESOURCE_IDS } from '@/game/config';
import { assignedWorkers, housing, population, rates } from '@/game/sim';
import { useI18n } from 'vue-i18n';
import { useGame } from './useGame';
import type { Component } from 'vue';
import type { ResourceId } from '@/game/config';

interface Row {
  id: string;
  name: string;
  icon: Component;
  value: number;
  note: string;
  tone: string;
  iconTone: string;
}

const ICONS: Record<ResourceId, Component> = {
  oil: Droplet,
  fish: Fish,
  wood: TreePine,
  iron: Anvil
};

const game = useGame();
const { t } = useI18n();

const s = game.state;

const resources = computed<Row[]>(() => {
  const perHour = rates(s.value);

  return RESOURCE_IDS.map(id => ({
    id,
    name: t(`resources.${id}`),
    icon: ICONS[id],
    value: Math.floor(s.value.resources[id]),
    note: formatRate(perHour[id]),
    tone: perHour[id] < -0.05 ? 'text-danger' : 'text-good',
    iconTone: id === 'oil' ? 'text-warm' : 'text-mist'
  }));
});

const people = computed<Row[]>(() => {
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
  <section class="plate pointer-events-auto w-80 p-4">
    <div class="label mb-2">
      {{ t('supplies.title') }}
    </div>
    <ul class="space-y-2">
      <li
        v-for="row in resources"
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
