import { ref } from 'vue';
import { getVolume, isMuted, setMuted, setVolume } from '@/audio/sound';
import { i18n, setLocale } from '@/i18n';
import type { Locale } from '@/i18n';

const muted = ref(isMuted());
const volume = ref(getVolume());

function toggleMute () {
  muted.value = !muted.value;
  setMuted(muted.value);
}

function changeVolume (value: number) {
  volume.value = value;
  setVolume(value);
  muted.value = isMuted();
}

function changeLocale (locale: Locale) {
  setLocale(locale);
}

/** Sound and language, shared by the menu and the quick buttons so both always show the same state. */
export function useSettings () {
  return {
    muted,
    volume,
    locale: i18n.global.locale,
    toggleMute,
    changeVolume,
    changeLocale
  };
}
