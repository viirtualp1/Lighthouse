<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { playClick, unlockSound } from './audio/sound';
import BuildBar from './ui/BuildBar.vue';
import BuildingCard from './ui/BuildingCard.vue';
import DawnModal from './ui/DawnModal.vue';
import EndModal from './ui/EndModal.vue';
import FindCard from './ui/FindCard.vue';
import GoalLine from './ui/GoalLine.vue';
import HudAlerts from './ui/HudAlerts.vue';
import HudLeft from './ui/HudLeft.vue';
import HudTop from './ui/HudTop.vue';
import LighthouseHud from './ui/LighthouseHud.vue';
import MainMenu from './ui/MainMenu.vue';
import MapView from './ui/MapView.vue';
import PauseMenu from './ui/PauseMenu.vue';
import PhaseBanner from './ui/PhaseBanner.vue';
import ResourcePanel from './ui/ResourcePanel.vue';
import RestorationCard from './ui/RestorationCard.vue';
import TutorialOverlay from './ui/TutorialOverlay.vue';
import { useGame } from './ui/useGame';

const game = useGame();

const generation = ref(0);

function onKey (event: KeyboardEvent) {
  if (game.screen.value !== 'game' || (game.menuOpen.value && event.code !== 'Escape')) {
    return;
  }

  if (event.code === 'Space') {
    event.preventDefault();
    game.togglePause();
  } else if (event.code === 'Escape') {
    game.escape();
  } else if (event.code === 'KeyQ') {
    game.rotateBeam(-1);
  } else if (event.code === 'KeyE') {
    game.rotateBeam(1);
  } else if (['Digit1', 'Digit2', 'Digit3'].includes(event.code)) {
    game.setSpeed(Number(event.code.slice(-1)));
  } else if (event.code === 'Enter' && game.state.value.dawnReport) {
    game.closeDawnReport();
  }
}

function onPointerDown (event: PointerEvent) {
  unlockSound();

  if (event.target instanceof Element && event.target.closest('button:not(:disabled)')) {
    playClick();
  }
}

game.onRestart(() => {
  generation.value++;
});

onMounted(() => {
  window.addEventListener('keydown', onKey);
  window.addEventListener('pointerdown', onPointerDown, true);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey);
  window.removeEventListener('pointerdown', onPointerDown, true);
});
</script>

<template>
  <div class="relative h-full overflow-hidden">
    <MapView :key="generation" />
    <Transition
      enter-from-class="opacity-0"
      enter-active-class="transition duration-500"
      leave-to-class="opacity-0"
      leave-active-class="transition duration-300"
    >
      <MainMenu v-if="game.screen.value === 'menu'" />
    </Transition>
    <div
      v-if="game.screen.value === 'game'"
      class="pointer-events-none absolute inset-0"
    >
      <PhaseBanner />
      <HudTop />
      <GoalLine />
      <HudLeft />
      <HudAlerts />
      <LighthouseHud />
      <BuildBar />
      <div class="pointer-events-none absolute right-4 bottom-4 flex flex-col items-end gap-2">
        <RestorationCard />
        <FindCard />
        <BuildingCard />
        <ResourcePanel />
      </div>
      <DawnModal />
      <EndModal />
      <PauseMenu />
    </div>
    <TutorialOverlay v-if="game.screen.value === 'game'" />
  </div>
</template>
