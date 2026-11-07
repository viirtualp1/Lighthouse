<script setup lang="ts">
import { computed } from 'vue';
import { BedDouble, ChevronRight, Eye, Ghost, HeartPulse, TriangleExclamationPoint, Users } from '@lucide/vue';
import { BUILDINGS, GAME } from '@/game/config';
import { oilPerHour } from '@/game/light';
import { assignedWorkers, forecast, housing, nightHours, population, rates, shadowAt } from '@/game/sim';
import { useI18n } from 'vue-i18n';
import ResourceIcon from './ResourceIcon.vue';
import { useGame } from './useGame';
import type { Component } from 'vue';
import type { BuildingId, ResourceId } from '@/game/config';

interface Alert {
  id: string;
  resource?: ResourceId;
  icon?: Component;
  text: string;
  severe: boolean;
  action: string;
  run: () => void;
}

const LIMIT = 5;

const game = useGame();
const { t } = useI18n();

const alerts = computed(() => {
  const s = game.state.value;
  const list: Alert[] = [];
  const pop = population(s);
  const idle = s.healthy - assignedWorkers(s);
  const homeless = pop - housing(s);
  const hoursToDawn = 24 - s.hour;
  const lighthouse = s.buildings.find(b => b.type === 'lighthouse')!;
  const next = forecast(s, 1)[0];
  const oilNeeded = s.phase === 'day' ? next?.oil ?? 0 : Math.ceil(oilPerHour(s) * Math.min(hoursToDawn, nightHours(s)));

  if (s.resources.oil < oilNeeded) {
    list.push({
      id: 'oil',
      resource: 'oil',
      text: t('alerts.oil', { need: oilNeeded, have: Math.floor(s.resources.oil) }),
      severe: true,
      action: t('alerts.oilAction'),
      run: () => focusOrBuild('renderer')
    });
  }

  if (s.resources.fish + rates(s).fish * hoursToDawn < pop) {
    list.push({
      id: 'fish',
      resource: 'fish',
      text: t('alerts.fish', { n: pop }),
      severe: true,
      action: t('alerts.fishAction'),
      run: () => focusOrBuild('dock')
    });
  }

  if (lighthouse.workers < 2) {
    list.push({
      id: 'keepers',
      text: t('alerts.keepers'),
      severe: true,
      action: t('alerts.keepersAction'),
      run: () => game.setWorkers(lighthouse.id, 2)
    });
  }

  if (s.phase !== 'day') {
    const exposed = s.buildings.filter(b => b.workers > 0 && b.slot >= 0 && shadowAt(s, b.slot) >= 0.7);

    if (exposed.length) {
      list.push({
        id: 'exposed',
        icon: Eye,
        text: t('alerts.exposed', { n: exposed.reduce((n, b) => n + b.workers, 0) }),
        severe: true,
        action: t('alerts.exposedAction'),
        run: () => game.select(exposed[0]!.id)
      });
    }
  }

  if (homeless > 0) {
    list.push({
      id: 'homeless',
      icon: BedDouble,
      text: t('alerts.homeless', { n: homeless }),
      severe: false,
      action: t('alerts.homelessAction'),
      run: () => game.startPlacing('hut')
    });
  }

  if (idle > 0) {
    list.push({
      id: 'idle',
      icon: Users,
      text: t('alerts.idle', { n: idle }),
      severe: false,
      action: t('alerts.idleAction'),
      run: assignIdle
    });
  }

  if (s.sick > 0 && !s.buildings.some(b => b.type === 'infirmary')) {
    list.push({
      id: 'sick',
      icon: HeartPulse,
      text: t('alerts.sick', { n: s.sick }),
      severe: false,
      action: t('alerts.sickAction'),
      run: () => focusOrBuild('infirmary')
    });
  }

  if (s.fear >= GAME.fearStrikeAt && !s.buildings.some(b => b.type === 'chapel')) {
    list.push({
      id: 'fear',
      icon: Ghost,
      text: t('alerts.fear'),
      severe: s.fear >= GAME.fearDesertAt,
      action: t('alerts.fearAction'),
      run: () => focusOrBuild('chapel')
    });
  }

  return list.slice(0, LIMIT);
});

function focusOrBuild (type: BuildingId) {
  const existing = game.state.value.buildings.find(b => b.type === type);

  if (existing) {
    game.select(existing.id);
  } else {
    game.startPlacing(type);
  }
}

function assignIdle () {
  const s = game.state.value;
  const target = s.buildings.find(b => b.type !== 'lighthouse' && b.workers < BUILDINGS[b.type].maxWorkers);

  if (target) {
    game.select(target.id);
  }
}
</script>

<template>
  <aside
    class="pointer-events-none absolute top-4 right-4 flex flex-col items-end gap-1.5"
    data-tour="alerts"
  >
    <TransitionGroup
      enter-from-class="opacity-0 translate-x-4"
      enter-active-class="transition duration-300"
      leave-to-class="opacity-0"
      leave-active-class="transition duration-200 absolute"
    >
      <button
        v-for="alert in alerts"
        :key="alert.id"
        class="plate pointer-events-auto flex items-center gap-3 px-3 py-2.5 text-left whitespace-nowrap transition-colors hover:border-snow/40"
        @click="alert.run()"
      >
        <span
          class="grid h-7 w-7 shrink-0 place-items-center rounded-full border"
          :class="alert.severe ? 'border-danger/60 bg-danger/15' : 'border-snow/20 bg-snow/5'"
        >
          <ResourceIcon
            v-if="alert.resource"
            :id="alert.resource"
            :size="15"
          />
          <component
            :is="alert.icon ?? TriangleExclamationPoint"
            v-else
            :size="15"
            :stroke-width="1.7"
            :class="alert.severe ? 'text-danger' : 'text-mist'"
          />
        </span>
        <span class="flex-1 text-[14px] leading-snug">{{ alert.text }}</span>
        <span class="label flex shrink-0 items-center text-snow">{{ alert.action }}<ChevronRight :size="14" /></span>
      </button>
    </TransitionGroup>
  </aside>
</template>
