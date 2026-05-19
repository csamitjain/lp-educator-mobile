/**
 * LP Educator Hub — i18n Engine
 *
 * Architecture: one JSON file per language, flat dot-notation keys.
 *
 *   src/locales/en.json  ← all English strings
 *   src/locales/hi.json  ← all Hindi strings
 *   src/locales/mr.json  ← add later (create file + add to LANG_RESOURCES below)
 *
 * Usage in any component:
 *   const { t } = useTranslation()
 *   t('auth.login.title')                       → "Welcome Back" / "वापस स्वागत है"
 *   t('dashboard.greeting', { name: 'Priya' })  → "Hello, Priya" / "नमस्ते, Priya"
 *
 * DB override (non-technical team edits via Supabase / admin panel):
 *   Table: translations { lang, key, value }
 *   Example row: { lang: 'hi', key: 'auth.login.title', value: 'वापस स्वागत है' }
 *   Fetched on cold start, merged over local JSON. No-op if table absent.
 *
 * Adding a new language:
 *   1. Create src/locales/<lang>.json   (copy en.json, translate all values)
 *   2. import <lang> from '@locales/<lang>.json'  ← add line below
 *   3. Add to LANG_RESOURCES object below
 *   4. Add lang code to SUPPORTED_LANGUAGES in constants.ts
 *   That's it — detection, persistence, DB overrides all work automatically.
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

import {
  DEFAULT_LANGUAGE,
  StorageKeys,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from './constants';
import { supabase } from './supabase';

// ─── Language bundles ─────────────────────────────────────────────────────────
// One import per language. To add a new language, add an import here + entry in LANG_RESOURCES.

import en from '@locales/en.json';
import hi from '@locales/hi.json';
// import mr from '@locales/mr.json';  ← uncomment when ready

const LANG_RESOURCES: Record<string, Record<string, string>> = {
  en,
  hi,
  // mr,
};

// ─── Build i18next resources (single 'translation' namespace per language) ────

const resources = Object.fromEntries(
  Object.entries(LANG_RESOURCES).map(([lang, strings]) => [
    lang,
    { translation: strings },
  ])
);

// ─── Language detection (priority order) ─────────────────────────────────────

async function detectLanguage(): Promise<SupportedLanguage> {
  try {
    // 1. User's persisted explicit choice
    const stored = await AsyncStorage.getItem(StorageKeys.language);
    if (stored && SUPPORTED_LANGUAGES.includes(stored as SupportedLanguage)) {
      return stored as SupportedLanguage;
    }

    // 2. Device system locale
    const deviceCode = Localization.getLocales()[0]?.languageCode ?? '';
    const deviceLang = deviceCode.split('-')[0].toLowerCase();
    if (SUPPORTED_LANGUAGES.includes(deviceLang as SupportedLanguage)) {
      return deviceLang as SupportedLanguage;
    }
  } catch {
    // AsyncStorage or Localization failed — fall through to default
  }

  // 3. India default
  return DEFAULT_LANGUAGE as SupportedLanguage;
}

// ─── Supabase DB override fetch ───────────────────────────────────────────────

/**
 * Fetch all translation overrides for `lang` from the Supabase `translations` table
 * and merge them into i18next, overriding local JSON values.
 *
 * This is how the non-technical team updates strings without a new app release.
 *
 * Supabase table schema (backend team creates this):
 *   CREATE TABLE translations (
 *     id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     lang       text NOT NULL,          -- 'en' | 'hi' | 'mr' ...
 *     key        text NOT NULL,          -- 'auth.login.title'
 *     value      text NOT NULL,          -- translated string
 *     updated_at timestamptz DEFAULT now(),
 *     UNIQUE(lang, key)
 *   );
 *   -- RLS: allow anon SELECT (translations are public content)
 *   ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
 *   CREATE POLICY "translations_read" ON translations FOR SELECT USING (true);
 *
 * Graceful no-ops when:
 *   - Table doesn't exist yet (error code 42P01)
 *   - Network is unavailable
 *   - Any unexpected error
 */
export async function fetchAndApplyDBTranslations(lang: string): Promise<void> {
  try {
    const { data, error } = await supabase
      .from('translations')
      .select('key, value')
      .eq('lang', lang);

    if (error) {
      if (error.code === '42P01') {
        console.log('[i18n] translations table not found — using local files only');
        return;
      }
      console.warn('[i18n] DB fetch failed:', error.message);
      return;
    }

    if (!data || data.length === 0) return;

    // Build flat override object
    const overrides: Record<string, string> = {};
    for (const row of data) {
      overrides[row.key] = row.value;
    }

    // Merge into i18next: deep=true, overwrite=true → DB wins over local JSON
    i18n.addResourceBundle(lang, 'translation', overrides, true, true);

    console.log(`[i18n] Applied ${data.length} DB overrides for lang="${lang}"`);
  } catch (err) {
    console.warn('[i18n] Unexpected error:', err);
  }
}

// ─── Change language ──────────────────────────────────────────────────────────

/**
 * Switch language, persist user choice, fetch DB overrides for new language.
 * All useTranslation() hooks re-render automatically.
 */
export async function changeLanguage(lang: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(StorageKeys.language, lang);
  await i18n.changeLanguage(lang);
  fetchAndApplyDBTranslations(lang).catch(() => {});
}

// ─── Init ─────────────────────────────────────────────────────────────────────

let _initialized = false;

export async function initI18n(): Promise<void> {
  if (_initialized) return;

  const language = await detectLanguage();

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: DEFAULT_LANGUAGE,
    defaultNS: 'translation',
    ns: ['translation'],
    interpolation: {
      escapeValue: false, // React Native handles escaping
    },
    react: {
      useSuspense: false, // RN doesn't support Suspense well yet
    },
    compatibilityJSON: 'v4',
  });

  // Non-blocking — DB overrides merge in background after local strings are ready
  fetchAndApplyDBTranslations(language).catch(() => {});

  _initialized = true;
}

export default i18n;

// ─── Utilities ────────────────────────────────────────────────────────────────

export function getCurrentLang(): SupportedLanguage {
  return (i18n.language as SupportedLanguage) ?? DEFAULT_LANGUAGE;
}

/**
 * Returns true for RTL script languages.
 * Extend this list when adding Arabic, Urdu, etc.
 */
export function isRTL(lang?: string): boolean {
  return ['ar', 'ur', 'he', 'fa'].includes(lang ?? getCurrentLang());
}
