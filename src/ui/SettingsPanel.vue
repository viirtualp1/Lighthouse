<template>
  <div class="flex flex-col gap-4">
    <div>
      <div class="mb-2 flex items-center justify-between">
        <span class="font-hud text-[11px] font-medium tracking-[0.12em] text-mist uppercase">{{ t('menu.volume') }}</span>
        <span class="font-hud text-[13px] font-medium text-mist lining-nums tabular-nums">{{ settings.muted.value ? '—' : Math.round(settings.volume.value * 100) }}</span>
      </div>
      <div class="flex items-center gap-3">
        <button
          class="inline-flex size-8 shrink-0 hud-btn items-center justify-center gap-1.5 text-[12px]"
          :aria-pressed="settings.muted.value"
          :aria-label="t('menu.sound')"
          @click="settings.toggleMute()"
        >
          <VolumeX
            v-if="settings.muted.value"
            :size="14"
          />
          <Volume2
            v-else
            :size="14"
          />
        </button>
        <input
          type="range"
          min="0"
          max="100"
          :value="Math.round(settings.volume.value * 100)"
          class="h-1 flex-1 cursor-pointer accent-snow"
          :aria-label="t('menu.volume')"
          @input="onVolume"
        >
      </div>
    </div>

    <button
      v-if="desktop"
      class="inline-flex h-9 hud-btn items-center justify-center gap-1.5 text-sm"
      @click="desktop.toggleFullscreen()"
    >
      {{ t('menu.fullscreen') }} · F11
    </button>

    <div>
      <div class="mb-2 font-hud text-[11px] font-medium tracking-[0.12em] text-mist uppercase">
        {{ t('menu.language') }}
      </div>
      <div class="grid grid-cols-2 gap-1.5">
        <button
          v-for="locale in LOCALES"
          :key="locale.id"
          class="inline-flex h-9 hud-btn items-center justify-center gap-1.5 text-sm tracking-normal normal-case"
          :aria-pressed="settings.locale.value === locale.id"
          @click="settings.changeLocale(locale.id)"
        >
          {{ locale.name }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Volume2, VolumeX } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { LOCALES } from '@/i18n';
import { useSettings } from './useSettings';

const desktop = window.desktop;

const settings = useSettings();
const { t } = useI18n();

function onVolume (event: Event) {
  if (event.target instanceof HTMLInputElement) {
    settings.changeVolume(Number(event.target.value) / 100);
  }
}
</script>
