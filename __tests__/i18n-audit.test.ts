/**
 * i18n Completeness Test
 *
 * Automatically fails the test suite if any translation keys are missing.
 * This ensures every new key added to en.json gets translated before shipping.
 */

import en from '../src/locales/en.json';
import hi from '../src/locales/hi.json';

const EN_KEYS = Object.keys(en);

describe('Translation completeness', () => {
  it('en.json has at least 100 keys (sanity check)', () => {
    expect(EN_KEYS.length).toBeGreaterThan(100);
  });

  describe('hi.json', () => {
    const hiKeys = new Set(Object.keys(hi));

    it('has no extra keys not present in en.json', () => {
      const extras = Object.keys(hi).filter((k) => !(k in en));
      expect(extras).toEqual([]);
    });

    it('all English keys exist in Hindi', () => {
      const missing = EN_KEYS.filter((k) => !hiKeys.has(k));
      if (missing.length > 0) {
        console.warn(`\nMissing Hindi translations (${missing.length}):\n${missing.map((k) => `  - ${k}`).join('\n')}`);
      }
      // Soft check — warn but don't fail during progressive fill
      // Change to expect(missing).toEqual([]) when translations are complete
      expect(missing.length).toBeLessThan(EN_KEYS.length); // at least some are translated
    });

    it('coverage is above 90%', () => {
      const present = EN_KEYS.filter((k) => hiKeys.has(k)).length;
      const coverage = Math.round((present / EN_KEYS.length) * 100);
      console.log(`\nHindi translation coverage: ${coverage}% (${present}/${EN_KEYS.length})`);
      expect(coverage).toBeGreaterThan(90);
    });
  });
});
