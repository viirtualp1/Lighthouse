import { createI18n } from 'vue-i18n';
import en from './en';
import ru from './ru';

export type Locale = 'en' | 'ru';

export const LOCALES: { id: Locale; name: string }[] = [
  { id: 'en', name: 'English' },
  { id: 'ru', name: 'Русский' }
];

const LOCALE_KEY = 'lighthouse.locale';

export const i18n = createI18n({
  legacy: false,
  locale: readLocale(),
  fallbackLocale: 'en',
  messages: { en, ru }
});

function readLocale (): Locale {
  try {
    return localStorage.getItem(LOCALE_KEY) === 'ru' ? 'ru' : 'en';
  } catch {
    return 'en';
  }
}

export function setLocale (locale: Locale) {
  i18n.global.locale.value = locale;
  document.documentElement.lang = locale;

  try {
    localStorage.setItem(LOCALE_KEY, locale);
  } catch {
    // Without storage the choice lasts until the page is closed.
  }
}

/** Translates outside components, for text the game builds itself. */
export function tr (key: string, params: Record<string, string | number> = {}) {
  return i18n.global.t(key, params);
}

document.documentElement.lang = readLocale();
