<script setup lang="ts">
import { computed } from 'vue';
import { Minus, Plus, User, X } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { GAME, RESTORATION } from '@/game/config';
import { assignedWorkers, canStartStage, currentStage, fearFactor } from '@/game/sim';
import ResourceIcon from './ResourceIcon.vue';
import { useGame } from './useGame';
import type { ResourceId } from '@/game/config';

const game = useGame();
const { t } = useI18n();

const s = game.state;

const open = computed(() => s.value.buildings.find(b => b.id === game.view.selectedId)?.type === 'lighthouse');

const card = computed(() => {
  const state = s.value;
  const r = state.restoration;
  const stage = currentStage(state);

  if (!stage) {
    return null;
  }

  const cost = (Object.keys(stage.cost) as ResourceId[]).map(id => ({
    id,
    amount: stage.cost[id] ?? 0,
    short: state.resources[id] < (stage.cost[id] ?? 0)
  }));

  const rate = r.builders * fearFactor(state);

  return {
    stage,
    index: r.stage,
    started: r.started,
    cost,
    canStart: canStartStage(state),
    progress: r.started ? r.progress / stage.work : 0,
    hoursLeft: rate > 0 ? Math.ceil((stage.work - r.progress) / rate) : null,
    builders: Array.from({ length: GAME.maxBuilders }, (_, i) => i < r.builders),
    free: state.healthy - assignedWorkers(state)
  };
});

function setTo (index: number) {
  const builders = s.value.restoration.builders;
  game.setBuilders(builders === index + 1 ? index : index + 1);
}

function close () {
  game.select(null);
}
</script>

<template>
  <section
    v-if="open"
    class="plate pointer-events-auto w-80 p-4"
    data-tour="restoration"
  >
    <header class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <div class="label">
          {{ t('restoration.title') }}
        </div>
        <h2 class="display mt-1 text-3xl leading-none">
          {{ card ? t(`restoration.stages.${card.stage.id}.name`) : t('buildings.lighthouse.name') }}
        </h2>
      </div>
      <button
        class="hud-btn h-7 w-7 shrink-0 border-transparent"
        :aria-label="t('card.close')"
        @click="close"
      >
        <X :size="14" />
      </button>
    </header>

    <ol class="mt-3 flex gap-1">
      <li
        v-for="(stage, i) in RESTORATION"
        :key="stage.id"
        class="h-1.5 flex-1 rounded-[1px]"
        :class="i < s.restoration.stage ? 'bg-warm' : i === s.restoration.stage ? 'bg-warm/30' : 'bg-snow/10'"
        :title="t(`restoration.stages.${stage.id}.name`)"
      />
    </ol>

    <template v-if="card">
      <p class="mt-3 text-[13px] text-mist">
        {{ t(`restoration.stages.${card.stage.id}.desc`) }}
      </p>
      <p class="mt-1 text-[13px] text-warm">
        {{ t('restoration.gain', { n: card.stage.rings }) }}<span v-if="card.stage.oilSaving"> · {{ t('restoration.saving', { n: Math.round(card.stage.oilSaving * 100) }) }}</span>
      </p>

      <div
        v-if="!card.started"
        class="mt-4 flex items-center justify-between gap-3 border-t border-snow/10 pt-3"
        @mouseenter="game.view.previewStage = true"
        @mouseleave="game.view.previewStage = false"
      >
        <span class="flex items-center gap-3">
          <span
            v-for="c in card.cost"
            :key="c.id"
            class="num flex items-center gap-1 text-[15px]"
            :class="c.short ? 'text-danger' : 'text-snow'"
          >
            <ResourceIcon
              :id="c.id"
              :size="15"
            />{{ c.amount }}
          </span>
        </span>
        <button
          class="hud-btn on h-8 px-3"
          :disabled="!card.canStart"
          @click="game.startStage()"
        >
          {{ t('restoration.deliver') }}
        </button>
      </div>

      <template v-else>
        <div class="mt-4 border-t border-snow/10 pt-3">
          <div class="h-2 overflow-hidden rounded-[1px] border border-warm/40">
            <div
              class="h-full bg-warm transition-[width] duration-300"
              :style="{ width: `${card.progress * 100}%` }"
            />
          </div>
          <p
            class="mt-1.5 text-[12px]"
            :class="card.hoursLeft === null ? 'text-danger' : 'text-mist'"
          >
            {{ card.hoursLeft === null ? t('restoration.noBuilders') : t('restoration.hoursLeft', { h: card.hoursLeft }) }}
          </p>
        </div>

        <div class="mt-3 flex items-center gap-2">
          <button
            class="hud-btn h-8 w-8"
            :aria-label="t('restoration.builders')"
            @click="game.setBuilders(s.restoration.builders - 1)"
          >
            <Minus :size="13" />
          </button>
          <div
            class="flex flex-1 justify-center gap-0.5"
            :title="`${t('restoration.builders')} · ${t('card.free', { n: card.free })}`"
          >
            <button
              v-for="(filled, i) in card.builders"
              :key="i"
              class="grid h-8 w-7 cursor-pointer place-items-center rounded-[2px] transition-colors hover:bg-snow/10"
              @click="setTo(i)"
            >
              <User
                :size="18"
                :stroke-width="1.6"
                :class="filled ? 'fill-snow text-snow' : 'text-snow/30'"
              />
            </button>
          </div>
          <button
            class="hud-btn h-8 w-8"
            :disabled="card.free <= 0"
            @click="game.setBuilders(s.restoration.builders + 1)"
          >
            <Plus :size="13" />
          </button>
        </div>
      </template>
    </template>

    <p
      v-else
      class="mt-3 text-[14px] text-warm"
    >
      {{ t('restoration.done') }}
    </p>
  </section>
</template>
