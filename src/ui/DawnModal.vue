<script setup lang="ts">
import { computed } from 'vue';
import { forecast, population } from '@/game/sim';
import { useI18n } from 'vue-i18n';
import ResourceIcon from './ResourceIcon.vue';
import { useGame } from './useGame';

const game = useGame();
const { t } = useI18n();

const report = computed(() => game.state.value.dawnReport);

const next = computed(() => forecast(game.state.value, 1)[0]);

const lines = computed(() => {
  const r = report.value;

  if (!r) {
    return [];
  }

  return [
    { key: 'eaten', value: r.eaten, bad: false },
    { key: 'hungry', value: r.hungry, bad: true },
    { key: 'gotSick', value: r.gotSick, bad: true },
    { key: 'recovered', value: r.recovered, bad: false },
    { key: 'vanished', value: r.vanished, bad: true },
    { key: 'deserted', value: r.deserted, bad: true },
    { key: 'died', value: r.died, bad: true }
  ].filter(line => line.value > 0 || line.key === 'eaten');
});
</script>

<template>
  <Transition
    enter-from-class="opacity-0"
    enter-active-class="transition duration-700"
  >
    <div
      v-if="report && game.state.value.status === 'playing'"
      class="pointer-events-auto absolute inset-0 z-20 grid place-items-center bg-[radial-gradient(ellipse_at_center,rgba(255,233,196,0.08),rgba(0,0,0,0.75)_70%)]"
    >
      <section class="plate w-[380px] px-7 py-6 text-center">
        <div class="label">
          {{ t('dawn.behind', { n: report.day }) }}
        </div>
        <h2 class="display mt-1 text-5xl">
          {{ t('dawn.title') }}
        </h2>
        <p class="mt-1 text-mist">
          {{ t('dawn.town', { n: population(game.state.value) }) }}
        </p>

        <ul class="mx-auto mt-5 max-w-72 space-y-1.5 text-left whitespace-nowrap">
          <li
            v-for="line in lines"
            :key="line.key"
            class="flex justify-between border-b border-snow/10 pb-1"
          >
            <span class="flex items-center gap-1.5 text-mist">
              <ResourceIcon
                v-if="line.key === 'eaten'"
                id="fish"
              />{{ t(`dawn.${line.key}`) }}
            </span>
            <span
              class="num"
              :class="line.bad ? 'text-danger' : 'text-snow'"
            >{{ line.value }}</span>
          </li>
        </ul>

        <ul
          v-if="next"
          class="mx-auto mt-4 max-w-64 space-y-1.5 text-left"
        >
          <li class="flex justify-between">
            <span class="text-mist">{{ t('dawn.nextNight') }}</span>
            <span class="num text-snow">{{ t('dawn.hours', { h: next.hours }) }}</span>
          </li>
          <li class="flex justify-between">
            <span class="flex items-center gap-1.5 text-mist"><ResourceIcon id="oil" />{{ t('dawn.oilNeeded') }}</span>
            <span
              class="num"
              :class="next.oil > game.state.value.resources.oil ? 'text-danger' : 'text-warm'"
            >{{ next.oil }}</span>
          </li>
        </ul>

        <button
          class="hud-btn on mt-5 h-10 w-full text-sm"
          @click="game.closeDawnReport()"
        >
          {{ t('dawn.button') }}
        </button>
      </section>
    </div>
  </Transition>
</template>
