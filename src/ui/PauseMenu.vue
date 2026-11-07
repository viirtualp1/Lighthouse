<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { GAME } from '@/game/config';
import ControlsList from './ControlsList.vue';
import SettingsPanel from './SettingsPanel.vue';
import { useGame } from './useGame';
import { useTutorial } from './useTutorial';

const game = useGame();
const tutorial = useTutorial();
const { t } = useI18n();

const confirmRestart = ref(false);
const showControls = ref(false);

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

          <SettingsPanel class="mt-4 border-t border-snow/10 pt-4" />

          <div class="mt-5 grid grid-cols-2 gap-1.5">
            <button
              class="hud-btn h-11 text-sm"
              @click="game.toMainMenu()"
            >
              {{ t('menu.mainMenu') }}
            </button>
            <button
              class="hud-btn h-11 text-sm"
              :class="confirmRestart ? 'border-danger text-danger' : ''"
              @click="restart"
            >
              {{ confirmRestart ? t('menu.confirmShort') : t('menu.restart') }}
            </button>
          </div>
        </div>

        <div
          v-else
          class="mt-6"
        >
          <ControlsList />
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
