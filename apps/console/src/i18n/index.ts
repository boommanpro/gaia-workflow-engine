/**
 * Unified i18n module for the console app.
 *
 * - Single source of truth: the `I18n` singleton from `@flowgram.ai/i18n`.
 * - Default locale: `zh-CN` (per project requirement).
 * - Supported locales: `zh-CN`, `en-US`.
 * - Components subscribe via `useLanguage()` so they re-render on language change.
 *
 * NOTE: We keep our own flat translation dictionaries and look up keys directly,
 * because `i18n-js` (used internally by `@flowgram.ai/i18n`) treats `.` as a
 * scope separator. That means `I18n.t('hero.title')` would look up
 * `translations[locale].hero.title` (nested) instead of the flat key
 * `'hero.title'` we use in our dictionaries. To support dotted flat keys we
 * bypass `I18n.t` for our own `t()` helper, while still registering the
 * languages with the singleton so flowgram.ai internals keep working.
 */
import { useEffect, useState } from 'react';
import { I18n } from '@flowgram.ai/i18n';

import { zhCN } from './locales/zh-CN';
import { enUS } from './locales/en-US';

export type Language = 'zh' | 'en';

const LANG_TO_LOCALE: Record<Language, string> = {
  zh: 'zh-CN',
  en: 'en-US',
};

const LOCALE_TO_LANG: Record<string, Language> = {
  'zh-CN': 'zh',
  'zh': 'zh',
  'en-US': 'en',
  'en': 'en',
};

const STORAGE_KEY = 'gaia.language';

/** Flat dictionaries keyed by locale. Lookups are direct (no scope splitting). */
const translations: Record<string, Record<string, string>> = {
  'zh-CN': zhCN.contents as Record<string, string>,
  'en-US': enUS.contents as Record<string, string>,
};

/** Current locale kept in sync with the I18n singleton. */
let currentLocale: string = 'zh-CN';

/** Initialize the I18n singleton with our translations and default locale. */
const initialize = () => {
  // Still register with the singleton so flowgram.ai internals can translate.
  I18n.addLanguage(zhCN);
  I18n.addLanguage(enUS);

  // 语言体系当前只打磨中文：无视浏览器语言与历史偏好，恒定中文。
  // （切换入口已标「待实现」；若跟随浏览器语言/历史 en 偏好，用户会被锁死在
  //   英文界面且无路可回 —— 实测踩坑。英文体系跟上后再恢复偏好解析。）
  currentLocale = 'zh-CN';
  I18n.locale = 'zh-CN';
};

initialize();

/**
 * Translation helper. Looks up keys directly in our flat dictionaries so that
 * dotted keys like `'hero.title'` work as expected. Falls back to zh-CN, then
 * to the key itself. Supports `{{name}}` placeholder interpolation.
 */
export const t = (key: string, options?: Record<string, any>): string => {
  let value = translations[currentLocale]?.[key];
  if (value === undefined) {
    value = translations['zh-CN']?.[key];
  }
  if (value === undefined) {
    // As a last resort, ask the I18n singleton — this covers keys that
    // flowgram.ai internals may have registered (e.g. "Yes"/"No").
    value = I18n.t(key, options);
  }
  if (options) {
    value = value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(options[k] ?? ''));
  }
  return value;
};

/** Get the current language as the short `zh` / `en` form. */
export const getCurrentLanguage = (): Language =>
  LOCALE_TO_LANG[currentLocale] ?? 'zh';

/** Get the current full locale string (`zh-CN` / `en-US`). */
export const getCurrentLocale = (): string => currentLocale || 'zh-CN';

/** Persist language preference and switch the global I18n locale. */
export const setLanguage = (lang: Language): void => {
  const locale = LANG_TO_LOCALE[lang];
  if (currentLocale !== locale) {
    currentLocale = locale;
  }
  // Keep the singleton in sync — this also fires onLanguageChange.
  if (I18n.locale !== locale) {
    I18n.locale = locale;
  } else {
    // Locale didn't change for the singleton, but our local `currentLocale`
    // may have. Force subscribers to re-render by toggling the singleton.
    I18n.locale = locale;
  }
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* ignore storage failures (e.g. private mode) */
  }
};

/**
 * React hook that re-renders the calling component whenever the language changes.
 * Returns the current short language code (`zh` / `en`).
 */
export const useLanguage = (): Language => {
  const [lang, setLang] = useState<Language>(getCurrentLanguage());

  useEffect(() => {
    const disposable = I18n.onLanguageChange(() => {
      // Sync local locale tracker with the singleton.
      currentLocale = I18n.locale;
      setLang(getCurrentLanguage());
    });
    return () => disposable.dispose();
  }, []);

  return lang;
};
