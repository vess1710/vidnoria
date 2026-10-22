/**
 * Dictionary Loader for Vidnoria i18n
 *
 * Uses dynamic imports for code-splitting - only the requested
 * locale's translation file is loaded at runtime.
 */

import type { Locale } from './index';

// Dictionary type based on our translation JSON structure
export type Dictionary = Record<string, unknown>;

/**
 * Map of locale codes to their lazy-loaded dictionary imports.
 * Each entry uses a dynamic import to enable Next.js code-splitting,
 * so only the required translation file is sent to the client.
 */
const dictionaries: Record<Locale, () => Promise<Dictionary>> = {
  tr: () =>
    import('../../../content/translations/tr.json').then(
      (module) => module.default as Dictionary
    ),
  en: () =>
    import('../../../content/translations/en.json').then(
      (module) => module.default as Dictionary
    ),
  ar: () =>
    import('../../../content/translations/ar.json').then(
      (module) => module.default as Dictionary
    ),
};

/**
 * Load the dictionary for a given locale.
 * Results are dynamically imported and can be cached by Next.js.
 *
 * @param locale - The locale code to load translations for
 * @returns The translation dictionary object
 *
 * @example
 * const dict = await getDictionary('en');
 * console.log(dict.nav.home); // "Home"
 */
export async function getDictionary(locale: Locale): Promise<Dictionary> {
  const loader = dictionaries[locale];

  if (!loader) {
    // Fallback to Turkish if an unsupported locale is somehow passed
    console.warn(
      `[i18n] Unknown locale "${locale}", falling back to "tr"`
    );
    return dictionaries.tr();
  }

  return loader();
}
