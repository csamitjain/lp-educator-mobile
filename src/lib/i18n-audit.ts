/**
 * i18n Audit Utility
 *
 * Run in development to find keys present in English but missing in other languages.
 *
 * Usage (in a dev screen or __tests__):
 *   import { auditTranslations } from '@/lib/i18n-audit';
 *   auditTranslations();
 */

import en from '@locales/en.json';
import hi from '@locales/hi.json';

interface AuditResult {
  lang: string;
  missingKeys: string[];
  extraKeys: string[];
  coverage: number; // 0–100
}

/**
 * Compare a language file against the English master.
 * English is the source of truth — all keys must exist in every other language.
 */
export function auditLanguage(
  targetLang: Record<string, string>,
  targetLangName: string
): AuditResult {
  const enKeys = Object.keys(en);
  const targetKeys = new Set(Object.keys(targetLang));

  const missingKeys = enKeys.filter((k) => !targetKeys.has(k));
  const extraKeys = Object.keys(targetLang).filter((k) => !(k in en));
  const coverage = Math.round(((enKeys.length - missingKeys.length) / enKeys.length) * 100);

  return { lang: targetLangName, missingKeys, extraKeys, coverage };
}

/**
 * Audit all supported languages and log results.
 * Call this during development to track translation completeness.
 */
export function auditTranslations(): void {
  const results: AuditResult[] = [
    auditLanguage(hi as Record<string, string>, 'hi'),
    // Add new languages here as you add them:
    // auditLanguage(mr as Record<string, string>, 'mr'),
  ];

  console.log('\n🌐 Translation Audit Report');
  console.log('═'.repeat(50));

  for (const result of results) {
    console.log(`\n📋 Language: ${result.lang.toUpperCase()}`);
    console.log(`   Coverage: ${result.coverage}% (${Object.keys(en).length - result.missingKeys.length}/${Object.keys(en).length} keys)`);

    if (result.missingKeys.length > 0) {
      console.log(`   ❌ Missing (${result.missingKeys.length} keys):`);
      result.missingKeys.forEach((k) => console.log(`      - ${k}`));
    } else {
      console.log(`   ✅ All keys present`);
    }

    if (result.extraKeys.length > 0) {
      console.log(`   ⚠️  Extra keys not in EN (${result.extraKeys.length}):`);
      result.extraKeys.forEach((k) => console.log(`      - ${k}`));
    }
  }

  console.log('\n' + '═'.repeat(50));

  const allComplete = results.every((r) => r.missingKeys.length === 0);
  if (allComplete) {
    console.log('✅ All languages are complete!\n');
  } else {
    const totalMissing = results.reduce((sum, r) => sum + r.missingKeys.length, 0);
    console.log(`⚠️  ${totalMissing} keys need translation across all languages.\n`);
  }
}

/**
 * Get translation coverage as a percentage for a given language.
 * Useful for showing progress in an admin dashboard.
 */
export function getTranslationCoverage(
  targetLang: Record<string, string>
): number {
  const enKeys = Object.keys(en);
  const targetKeys = new Set(Object.keys(targetLang));
  const present = enKeys.filter((k) => targetKeys.has(k)).length;
  return Math.round((present / enKeys.length) * 100);
}

/**
 * Get the total key count from the English master.
 */
export function getTotalKeyCount(): number {
  return Object.keys(en).length;
}
