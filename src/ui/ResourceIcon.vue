<script setup lang="ts">
import { Anvil, Droplet, Fish, TreePine } from '@lucide/vue';
import type { ResourceId } from '@/game/config';

const props = withDefaults(defineProps<{
  id: ResourceId;
  size?: number;
}>(), {
  size: 14
});

/** One shape and colour per resource everywhere it appears, so the icon alone says which resource a number is. */
const ICONS = {
  oil: { icon: Droplet, tone: 'text-warm' },
  fish: { icon: Fish, tone: 'text-sea' },
  wood: { icon: TreePine, tone: 'text-wood' },
  iron: { icon: Anvil, tone: 'text-mist' }
};
</script>

<template>
  <component
    :is="ICONS[props.id].icon"
    :size="props.size"
    :stroke-width="1.7"
    class="inline-block shrink-0 align-[-0.15em]"
    :class="ICONS[props.id].tone"
  />
</template>
