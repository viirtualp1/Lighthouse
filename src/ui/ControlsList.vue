<script setup lang="ts">
import { useI18n } from 'vue-i18n';

const CONTROLS = [
  ['menu.keyNames.space', 'menu.keys.pause'],
  ['1 · 2 · 3', 'menu.keys.speed'],
  ['Q · E', 'menu.keys.rotate'],
  ['menu.keyNames.wheel', 'menu.keys.zoom'],
  ['menu.keyNames.drag', 'menu.keys.pan'],
  ['menu.keyNames.rmb', 'menu.keys.cancel'],
  ['Esc', 'menu.keys.escape']
] as const;

const { t, te } = useI18n();

function keyName (key: string) {
  return te(key) ? t(key) : key;
}
</script>

<template>
  <ul class="space-y-2">
    <li
      v-for="[key, action] in CONTROLS"
      :key="action"
      class="flex items-center justify-between gap-4 border-b border-snow/10 pb-2 whitespace-nowrap"
    >
      <span class="text-[14px] text-mist">{{ t(action) }}</span>
      <span class="num rounded-[2px] border border-snow/20 px-2 py-0.5 text-[13px]">{{ keyName(key) }}</span>
    </li>
  </ul>
</template>
