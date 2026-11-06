<script setup lang="ts">
import { ref, watch } from 'vue';
import { Volume2, VolumeX } from '@lucide/vue';
import { useI18n } from 'vue-i18n';
import { GAME } from '@/game/config';
import { LOCALES } from '@/i18n';
import { useGame } from './useGame';
import { useSettings } from './useSettings';
import { useTutorial } from './useTutorial';

const CONTROLS = [
  ['menu.keyNames.space', 'menu.keys.pause'],
  ['1 · 2 · 3', 'menu.keys.speed'],
  ['Q · E', 'menu.keys.rotate'],
  ['menu.keyNames.wheel', 'menu.keys.zoom'],
  ['menu.keyNames.drag', 'menu.keys.pan'],
  ['menu.keyNames.rmb', 'menu.keys.cancel'],
  ['Esc', 'menu.keys.escape']
] as const;

const game = useGame();
const tutorial = useTutorial();
const settings = useSettings();
const { t, te } = useI18n();

const confirmRestart = ref(false);
const showControls = ref(false);

function keyName (key: string) {
  return te(key) ? t(key) : key;
}

function onVolume (event: Event) {
  if (event.target instanceof HTMLInputElement) {
    settings.changeVolume(Number(event.target.value) / 100);
  }
}

function startTutorial () {
  game.closeMenu();
  tutorial.start();
}

function restart () {
  if (!confirmRestart.value) {
    confirmRestart.value = true;

    return;
  }

  game.restart();
}

watch(game.menuOpen, open => {
  if (open) {
    confirmRestart.value = false;
    showControls.value = false;
  }
});
</script>

<template>
  <Transition
    enter-from-class="opacity-0"
    enter-active-class="transition duration-200"
    leave-to-class="opacity-0"
    leave-active-class="transition duration-150"
  >
    <div
      v-if="game.menuOpen.value"
      class="pointer-events-auto absolute inset-0 z-40 grid place-items-center bg-black/65 backdrop-blur-[2px]"
      @click.self="game.closeMenu()"
    >
      <section class="plate w-[380px] px-7 py-6">
        <div class="label text-center">
          {{ t('menu.day', { day: Math.min(game.state.value.day, GAME.daysToWin), total: GAME.daysToWin }) }}
        </div>
        <h2 class="display mt-1 text-center text-5xl">
          {{ showControls ? t('menu.controls') : t('menu.title') }}
        </h2>

        <div
          v-if="!showControls"
          class="mt-6 flex flex-col gap-1.5"
        >
          <button
            class="hud-btn on h-11 text-sm"
            @click="game.closeMenu()"
          >
            {{ t('menu.resume') }}
          </button>
          <button
            class="hud-btn h-11 text-sm"
            @click="startTutorial"
          >
            {{ t('menu.tutorial') }}
          </button>
          <button
            class="hud-btn h-11 text-sm"
            @click="showControls = true"
          >
            {{ t('menu.controls') }}
          </button>

          <div class="mt-4 border-t border-snow/10 pt-4">
            <div class="mb-2 flex items-center justify-between">
              <span class="label">{{ t('menu.volume') }}</span>
              <span class="num text-[13px] text-mist">{{ settings.muted.value ? '—' : Math.round(settings.volume.value * 100) }}</span>
            </div>
            <div class="flex items-center gap-3">
              <button
                class="hud-btn h-8 w-8 shrink-0"
                :class="{ on: settings.muted.value }"
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

          <div class="mt-4">
            <div class="label mb-2">
              {{ t('menu.language') }}
            </div>
            <div class="grid grid-cols-2 gap-1.5">
              <button
                v-for="locale in LOCALES"
                :key="locale.id"
                class="hud-btn h-9 text-sm normal-case tracking-normal"
                :class="{ on: settings.locale.value === locale.id }"
                @click="settings.changeLocale(locale.id)"
              >
                {{ locale.name }}
              </button>
            </div>
          </div>

          <button
            class="hud-btn mt-5 h-11 text-sm"
            :class="confirmRestart ? 'border-danger text-danger' : ''"
            @click="restart"
          >
            {{ confirmRestart ? t('menu.confirmRestart') : t('menu.restart') }}
          </button>
        </div>

        <div
          v-else
          class="mt-6"
        >
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
          <button
            class="hud-btn mt-5 h-11 w-full text-sm"
            @click="showControls = false"
          >
            {{ t('menu.back') }}
          </button>
        </div>
      </section>
    </div>
  </Transition>
</template>
