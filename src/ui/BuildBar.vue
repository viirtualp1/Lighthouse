<script setup lang="ts">
import { computed, ref } from 'vue';
import { Anchor, Axe, Church, Cross, Flame, Fuel, GraduationCap, House, Lamp, Menu, Volume2, VolumeX, Wrench } from '@lucide/vue';
import { BUILD_ORDER, BUILDINGS } from '@/game/config';
import { canAfford } from '@/game/sim';
import { useI18n } from 'vue-i18n';
import { useGame } from './useGame';
import { useSettings } from './useSettings';
import { useTutorial } from './useTutorial';
import type { Component } from 'vue';
import type { BuildingId, ResourceId } from '@/game/config';

const ICONS: Partial<Record<BuildingId, Component>> = {
  hut: House,
  dock: Anchor,
  driftwood: Axe,
  renderer: Flame,
  oilCollector: Fuel,
  salvage: Wrench,
  lantern: Lamp,
  infirmary: Cross,
  chapel: Church
};

const game = useGame();
const { t } = useI18n();
const tutorial = useTutorial();
const settings = useSettings();

const hovered = ref<BuildingId | null>(null);

const items = computed(() => BUILD_ORDER.map(id => ({
  id,
  def: BUILDINGS[id],
  icon: ICONS[id],
  affordable: canAfford(game.state.value, id)
})));

const tip = computed(() => {
  const id = hovered.value ?? game.view.placing;

  if (!id) {
    return null;
  }

  const def = BUILDINGS[id];
  const cost = (Object.keys(def.cost) as ResourceId[]).map(r => ({
    name: t(`resources.${r}`),
    amount: def.cost[r] ?? 0,
    short: game.state.value.resources[r] < (def.cost[r] ?? 0)
  }));

  return { id, def, cost };
});
</script>

<template>
  <nav class="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
    <div
      v-if="tip"
      class="plate w-80 px-4 py-3"
    >
      <div class="display text-2xl leading-none">
        {{ t(`buildings.${tip.id}.name`) }}
      </div>
      <p class="mt-1 text-[13px] text-mist">
        {{ t(`buildings.${tip.id}.hint`) }}
      </p>
      <div class="mt-2 flex gap-3">
        <span
          v-for="c in tip.cost"
          :key="c.name"
          class="num text-[13px]"
          :class="c.short ? 'text-danger' : 'text-snow'"
        >{{ c.amount }} <span class="label">{{ c.name }}</span></span>
        <span
          v-if="tip.def.maxWorkers"
          class="num ml-auto text-[13px] text-mist"
        >{{ t('build.upTo', { n: tip.def.maxWorkers }) }}</span>
      </div>
    </div>

    <div class="flex items-stretch gap-2">
      <div class="plate pointer-events-auto flex gap-1 p-1.5">
        <button
          v-for="item in items"
          :key="item.id"
          class="hud-btn h-16 min-w-[72px] flex-col gap-1 px-2.5 whitespace-nowrap normal-case tracking-normal"
          :class="{ on: game.view.placing === item.id }"
          :disabled="!item.affordable && game.view.placing !== item.id"
          :data-tour="`build-${item.id}`"
          @mouseenter="hovered = item.id"
          @mouseleave="hovered = null"
          @click="game.startPlacing(item.id)"
        >
          <component
            :is="item.icon"
            :size="24"
            :stroke-width="1.5"
          />
          <span class="text-[11px] leading-tight">{{ t(`buildings.${item.id}.name`) }}</span>
        </button>
      </div>

      <div class="plate pointer-events-auto flex gap-1 p-1.5">
        <button
          class="hud-btn h-16 min-w-[64px] flex-col gap-1 px-2.5 whitespace-nowrap normal-case tracking-normal"
          :class="{ on: game.menuOpen.value }"
          :title="t('menu.open')"
          @click="game.openMenu()"
        >
          <Menu
            :size="22"
            :stroke-width="1.5"
          />
          <span class="text-[11px] leading-tight">{{ t('menu.label') }} · Esc</span>
        </button>
        <button
          class="hud-btn h-16 w-12 flex-col"
          :title="t('menu.tutorial')"
          @click="tutorial.start()"
        >
          <GraduationCap
            :size="20"
            :stroke-width="1.5"
          />
        </button>
        <button
          class="hud-btn h-16 w-12 flex-col"
          :title="t('menu.sound')"
          @click="settings.toggleMute()"
        >
          <VolumeX
            v-if="settings.muted.value"
            :size="20"
            :stroke-width="1.5"
          />
          <Volume2
            v-else
            :size="20"
            :stroke-width="1.5"
          />
        </button>
      </div>
    </div>
  </nav>
</template>
