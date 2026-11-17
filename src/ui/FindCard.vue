<template>
  <section
    v-if="page"
    class="plate pointer-events-auto relative w-80 p-5"
  >
    <header class="flex items-start gap-2">
      <BookOpen
        :size="18"
        :stroke-width="1.6"
        class="mt-0.5 shrink-0 text-warm"
      />
      <span class="flex-1 font-hud text-[11px] font-medium tracking-[0.12em] text-mist uppercase">{{ t('journal.title', { n: page.n }) }}</span>
      <button
        class="inline-flex size-7 shrink-0 hud-btn items-center justify-center gap-1.5 border-transparent text-[12px]"
        :aria-label="t('journal.close')"
        @click="game.closeJournal()"
      >
        <X :size="14" />
      </button>
    </header>
    <p class="mt-3 font-display text-[21px] leading-snug font-semibold text-snow/95 italic">
      “{{ page.text }}”
    </p>
  </section>

  <section
    v-else-if="find"
    class="plate pointer-events-auto relative w-80 p-4"
  >
    <header class="flex items-start gap-2">
      <div class="min-w-0 flex-1">
        <h2 class="font-display text-3xl leading-none font-semibold">
          {{ t(`finds.kinds.${find.kind}.name`) }}
        </h2>
        <p class="mt-1 text-[13px] text-mist">
          {{ t(`finds.kinds.${find.kind}.desc`) }}
        </p>
      </div>
      <button
        class="inline-flex size-7 shrink-0 hud-btn items-center justify-center gap-1.5 border-transparent text-[12px]"
        :aria-label="t('card.close')"
        @click="game.selectFind(null)"
      >
        <X :size="14" />
      </button>
    </header>

    <div class="mt-4 flex items-center gap-4 border-t border-snow/10 pt-3 text-[15px]">
      <span
        v-for="r in find.rewards"
        :key="r.id"
        class="flex items-center gap-1.5 font-hud font-medium lining-nums tabular-nums"
      >
        <ResourceIcon
          :id="r.id"
          :size="16"
        />+{{ r.amount }}
      </span>
      <span
        v-if="find.people"
        class="flex items-center gap-1.5 font-hud font-medium lining-nums tabular-nums"
      >
        <Users
          :size="16"
          :stroke-width="1.6"
          class="text-mist"
        />{{ t('finds.people', { n: find.people }) }}
      </span>
      <span
        v-if="find.kind === 'wreck'"
        class="flex items-center gap-1.5 text-[14px]"
      >
        <Wrench
          :size="15"
          :stroke-width="1.6"
          class="text-mist"
        />{{ t('finds.wreckReward') }}
      </span>
      <span
        v-if="find.kind === 'journal'"
        class="flex items-center gap-1.5 text-[14px]"
      >
        <Ghost
          :size="15"
          :stroke-width="1.6"
          class="text-mist"
        />{{ t('finds.journalReward') }}
      </span>
    </div>

    <button
      class="mt-4 inline-flex h-9 w-full hud-btn items-center justify-center gap-1.5 text-[12px]"
      data-primary
      :disabled="!find.ready"
      @click="game.collectFind(find.id)"
    >
      {{ t('finds.collect') }}
    </button>
    <p
      v-if="!find.ready"
      class="mt-2 text-[12px] text-mist"
    >
      {{ t('finds.waitDay') }}
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Ghost, BookOpen, Users, Wrench, X } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { canCollect } from '@/game/sim';
import ResourceIcon from './ResourceIcon.vue';
import { useGame } from './useGame';
import type { ResourceId } from '@/game/config';

const game = useGame();
const { t, tm } = useI18n();

const s = game.state;

const find = computed(() => {
  const found = s.value.finds.find(f => f.id === game.view.selectedFind);

  if (!found) {
    return null;
  }

  return {
    ...found,
    rewards: (Object.keys(found.reward) as ResourceId[]).map(id => ({ id, amount: found.reward[id] ?? 0 })),
    ready: canCollect(s.value, found.id)
  };
});

const page = computed(() => {
  const n = game.journalPage.value;
  const pages = tm('journal.pages') as string[];

  return n === null ? null : { n, text: pages[n - 1] ?? '' };
});
</script>
