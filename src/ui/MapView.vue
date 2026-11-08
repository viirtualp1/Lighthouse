<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue';
import { BUILDINGS, RESTORATION } from '@/game/config';
import { DIM, LIT, tonightRisk } from '@/game/light';
import { canPlace, currentStage, lightAt, residentsOf, shadowAt } from '@/game/sim';
import { GameRenderer } from '@/render/GameRenderer';
import { useI18n } from 'vue-i18n';
import { buildingStatus } from './buildingStatus';
import ResourceIcon from './ResourceIcon.vue';
import { useGame } from './useGame';
import type { ResourceId } from '@/game/config';

let renderer: GameRenderer | null = null;

const game = useGame();
const { t } = useI18n();

const host = useTemplateRef<HTMLDivElement>('host');

const hint = computed(() => {
  if (game.view.aiming) {
    return t('map.aimHint');
  }

  if (game.view.placing) {
    return t('map.placeHint', { building: t(`buildings.${game.view.placing}.name`) });
  }

  return null;
});

const tooltip = computed(() => {
  const s = game.state.value;
  const slotId = game.view.hoverSlot;
  const at = game.screenPointer.value;
  const slot = slotId === null ? undefined : s.map.slots[slotId];
  const target = game.hoverTarget.value;

  if (!at || game.view.aiming || game.screen.value !== 'game') {
    return null;
  }

  const find = target?.find === null || target?.find === undefined ? undefined : s.finds.find(f => f.id === target.find);

  if (find) {
    return { title: t(`finds.kinds.${find.kind}.name`), lines: [{ text: t('finds.hint'), tone: 'text-warm' }], x: at.x + 18, y: at.y + 18 };
  }

  if (target?.lighthouse) {
    const stage = currentStage(s);

    return {
      title: t('buildings.lighthouse.name'),
      lines: [
        { text: stage ? `${t('restoration.title')} · ${t('restoration.stage', { n: s.restoration.stage + 1, total: RESTORATION.length })}` : t('restoration.done'), tone: 'text-warm' },
        { text: t('map.manage'), tone: 'text-fog' }
      ],
      x: at.x + 18,
      y: at.y + 18
    };
  }

  if (!slot) {
    return null;
  }

  const lines: { text: string; tone: string; resource?: ResourceId }[] = [];
  const building = s.buildings.find(b => b.slot === slot.id);
  let title = t('map.freeSpot');

  if (building) {
    const def = BUILDINGS[building.type];
    const status = buildingStatus(s, building);
    title = t(`buildings.${building.type}.name`);

    if (def.maxWorkers) {
      lines.push({ text: building.workers ? t('map.workers', { n: building.workers, max: def.maxWorkers }) : t('map.noWorkers'), tone: building.workers ? 'text-snow' : 'text-danger' });
    }

    if (def.housing) {
      lines.push({ text: `${t('card.residents')} ${residentsOf(s, building.id)}/${def.housing}`, tone: 'text-snow' });
    }

    if (status) {
      lines.push({ text: t(status.key), tone: status.tone });
    }

    lines.push({ text: t('map.manage'), tone: 'text-fog' });
  } else if (slot.kind === 'oil') {
    title = t('map.oilPool');
    lines.push({ text: t('map.oilPoolHint'), tone: 'text-mist', resource: 'oil' });
  } else if (slot.kind === 'wreck') {
    title = t('map.wreck');
    lines.push({ text: t('map.wreckHint', { n: Math.floor(slot.wreckIron) }), tone: 'text-mist', resource: 'iron' });
  } else if (slot.shore) {
    lines.push({ text: t('map.shore'), tone: 'text-mist' });
  }

  if (!building && s.phase === 'day') {
    const risk = tonightRisk(s, slot.x, slot.y);
    const home = !!(game.view.placing && BUILDINGS[game.view.placing].housing);
    const key = home && risk.level !== LIT ? `${risk.key}Home` : risk.key;
    lines.push({ text: t(key), tone: risk.tone });
  } else if (!building) {
    const light = lightAt(s, slot.id);
    const covered = shadowAt(s, slot.id) >= 0.7;
    lines.push({
      text: covered ? t('map.shadowHere') : light === LIT ? t('map.lit') : light === DIM ? t('map.dimNow') : t('map.dark'),
      tone: covered ? 'text-danger' : light === LIT ? 'text-warm' : 'text-mist'
    });
  }

  if (game.view.placing) {
    const error = canPlace(s, game.view.placing, slot.id);
    lines.unshift({ text: error ? t(`place.${error}`) : t('map.clickToBuild'), tone: error ? 'text-danger' : 'text-good' });
  }

  return { title, lines, x: at.x + 18, y: at.y + 18 };
});

onMounted(async () => {
  renderer = new GameRenderer(game.state.value, {
    frame: seconds => {
      const effects = game.frame(seconds);
      renderer?.draw(game.view, effects);
    },
    hover: game.hover,
    press: game.press,
    cancel: game.cancel
  });

  await renderer.mount(host.value!);
  game.projector.value = point => renderer!.toScreen(point);
});

onBeforeUnmount(() => {
  game.projector.value = null;
  renderer?.destroy();
  renderer = null;
});
</script>

<template>
  <div class="absolute inset-0">
    <div
      ref="host"
      class="absolute inset-0"
      :class="game.view.placing || game.view.aiming ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing'"
    />
    <div class="pointer-events-none absolute inset-0 shadow-[inset_0_0_180px_rgba(0,0,0,0.9)]" />

    <p
      v-if="hint"
      class="plate pointer-events-none absolute top-28 left-1/2 -translate-x-1/2 px-5 py-2 text-[14px] whitespace-nowrap text-snow"
    >
      {{ hint }}
    </p>

    <div
      v-if="tooltip"
      class="plate pointer-events-none fixed z-10 px-3.5 py-2.5 whitespace-nowrap"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      <div class="display text-xl leading-tight">
        {{ tooltip.title }}
      </div>
      <p
        v-for="line in tooltip.lines"
        :key="line.text"
        class="mt-0.5 flex items-center gap-1.5 text-[14px]"
        :class="line.tone"
      >
        <ResourceIcon
          v-if="line.resource"
          :id="line.resource"
        />{{ line.text }}
      </p>
    </div>
  </div>
</template>
