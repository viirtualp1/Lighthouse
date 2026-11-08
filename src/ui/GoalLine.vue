<script setup lang="ts">
import { computed } from 'vue';
import { Hammer } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { RESTORATION } from '@/game/config';
import { currentStage } from '@/game/sim';
import ResourceIcon from './ResourceIcon.vue';
import { useGame } from './useGame';
import type { ResourceId } from '@/game/config';

const game = useGame();
const { t } = useI18n();

const s = game.state;

/** The one thing the town is working towards right now, always in view under the clock. */
const goal = computed(() => {
  const r = s.value.restoration;
  const stage = currentStage(s.value);

  if (!stage) {
    return { text: t('goal.done'), cost: [], warn: false, step: RESTORATION.length };
  }

  const name = t(`restoration.stages.${stage.id}.name`);

  if (!r.started) {
    return {
      text: t('goal.restore', { stage: name }),
      cost: (Object.keys(stage.cost) as ResourceId[]).map(id => ({ id, amount: stage.cost[id] ?? 0, short: s.value.resources[id] < (stage.cost[id] ?? 0) })),
      warn: false,
      step: r.stage + 1
    };
  }

  return {
    text: `${t('goal.progress', { stage: name, pct: Math.floor((r.progress / stage.work) * 100) })}${r.builders ? '' : ` · ${t('goal.idle')}`}`,
    cost: [],
    warn: r.builders === 0,
    step: r.stage + 1
  };
});
</script>

<template>
  <button
    class="plate pointer-events-auto absolute top-[100px] left-1/2 flex -translate-x-1/2 items-center gap-2.5 px-3.5 py-1.5 whitespace-nowrap transition-colors hover:border-snow/40"
    data-tour="goal"
    @click="game.selectLighthouse()"
  >
    <Hammer
      :size="14"
      :stroke-width="1.7"
      class="text-warm"
    />
    <span class="label text-warm">{{ t('goal.label') }} {{ goal.step }}/{{ RESTORATION.length }}</span>
    <span
      class="text-[14px]"
      :class="goal.warn ? 'text-danger' : 'text-snow'"
    >{{ goal.text }}</span>
    <span
      v-for="c in goal.cost"
      :key="c.id"
      class="num flex items-center gap-1 text-[13px]"
      :class="c.short ? 'text-danger' : 'text-mist'"
    >
      <ResourceIcon
        :id="c.id"
        :size="13"
      />{{ c.amount }}
    </span>
  </button>
</template>
