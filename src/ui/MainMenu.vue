<script setup lang="ts">
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import ControlsList from './ControlsList.vue';
import SettingsPanel from './SettingsPanel.vue';
import { useGame } from './useGame';

type Panel = 'settings' | 'controls' | null;

const desktop = window.desktop;

const game = useGame();
const { t } = useI18n();

const panel = ref<Panel>(null);
const confirmNew = ref(false);

const canContinue = computed(() => game.hasGame.value && game.state.value.status === 'playing');

function newGame () {
  if (canContinue.value && !confirmNew.value) {
    confirmNew.value = true;

    return;
  }

  confirmNew.value = false;
  panel.value = null;
  game.newGame();
}

function toggle (next: Exclude<Panel, null>) {
  confirmNew.value = false;
  panel.value = panel.value === next ? null : next;
}
</script>

<template>
  <div class="pointer-events-auto absolute inset-0 z-30 flex items-center bg-[linear-gradient(90deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.55)_38%,rgba(0,0,0,0)_70%)]">
    <div class="ml-[8vw] flex flex-col">
      <h1 class="display text-8xl leading-none whitespace-nowrap text-snow drop-shadow-[0_6px_30px_rgba(0,0,0,0.8)]">
        {{ t('mainMenu.title') }}
      </h1>

      <div class="mt-12 flex items-start gap-10">
        <nav class="flex w-72 shrink-0 flex-col items-start gap-1">
          <button
            v-if="canContinue"
            class="menu-item"
            @click="game.continueGame()"
          >
            {{ t('mainMenu.continue') }}
          </button>
          <button
            class="menu-item"
            :class="{ 'text-danger!': confirmNew }"
            @click="newGame"
          >
            {{ confirmNew ? t('mainMenu.confirmNew') : t('mainMenu.newGame') }}
          </button>
          <button
            class="menu-item"
            :class="{ active: panel === 'settings' }"
            @click="toggle('settings')"
          >
            {{ t('mainMenu.settings') }}
          </button>
          <button
            class="menu-item"
            :class="{ active: panel === 'controls' }"
            @click="toggle('controls')"
          >
            {{ t('mainMenu.controls') }}
          </button>
          <button
            v-if="desktop"
            class="menu-item mt-4"
            @click="desktop.quit()"
          >
            {{ t('mainMenu.quit') }}
          </button>
        </nav>

        <Transition
          enter-from-class="opacity-0 -translate-x-3"
          enter-active-class="transition duration-200"
          leave-to-class="opacity-0"
          leave-active-class="transition duration-150"
          mode="out-in"
        >
          <section
            v-if="panel"
            :key="panel"
            class="plate w-[360px] px-6 py-5"
          >
            <h2 class="display mb-4 text-3xl leading-none">
              {{ panel === 'settings' ? t('mainMenu.settings') : t('mainMenu.controls') }}
            </h2>
            <SettingsPanel v-if="panel === 'settings'" />
            <ControlsList v-else />
          </section>
        </Transition>
      </div>
    </div>

    <span class="label absolute bottom-6 left-[8vw] text-fog">{{ t('mainMenu.footer') }}</span>
  </div>
</template>

<style scoped>
.menu-item {
  position: relative;
  padding: 6px 0 6px 22px;
  font-family: var(--font-hud);
  font-size: 22px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgb(242 244 245 / 0.62);
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.15s,
    padding-left 0.2s;
}

/* A short warm bar, like the lamp's own light, marks the item under the pointer. */
.menu-item::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  width: 10px;
  height: 2px;
  background: var(--color-warm);
  opacity: 0;
  transform: translateY(-50%) scaleX(0);
  transform-origin: left;
  transition:
    opacity 0.15s,
    transform 0.2s;
}

.menu-item:hover,
.menu-item.active {
  color: var(--color-snow);
  padding-left: 28px;
}

.menu-item:hover::before,
.menu-item.active::before {
  opacity: 1;
  transform: translateY(-50%) scaleX(1);
}
</style>
