/**
 * Vidnoria i18n (Internationalization) System
 *
 * Supports three locales:
 * - Turkish (tr) - default
 * - English (en)
 * - Arabic (ar) - RTL
 */

// ─── Types ──────────────────────────────────────────────────────────────────────

/** Supported locale codes */
export type Locale = 'tr' | 'en' | 'ar';

/** All available locales */
export const locales: Locale[] = ['tr', 'en', 'ar'];

/** Default locale (Turkish) */
export const defaultLocale: Locale = 'tr';

/** Locales that use right-to-left text direction */
export const rtlLocales: Locale[] = ['ar'];

/** Human-readable locale names (in their own language) */
export const localeNames: Record<Locale, string> = {
  tr: 'Türkçe',
  en: 'English',
  ar: 'العربية',
};

/** Language codes for HTML lang attribute */
export const localeHtmlLang: Record<Locale, string> = {
  tr: 'tr',
  en: 'en',
  ar: 'ar',
};

// ─── Direction Helpers ──────────────────────────────────────────────────────────

/**
 * Check if a locale uses right-to-left text direction
 */
export function isRtl(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

/**
 * Get the text direction for a given locale
 */
export function getDirection(locale: Locale): 'ltr' | 'rtl' {
  return isRtl(locale) ? 'rtl' : 'ltr';
}

// ─── Translation Helpers ────────────────────────────────────────────────────────

/**
 * Retrieve a nested value from an object using a dot-notation path.
 *
 * @example
 * getNestedValue({ nav: { home: "Home" } }, "nav.home") // "Home"
 *
 * For array access use bracket notation:
 * getNestedValue(obj, "faq.items.0.question") // First FAQ question
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined) {
      return path; // Return the path as fallback if value not found
    }

    if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[key];
    } else {
      return path; // Return the path as fallback
    }
  }

  if (typeof current === 'string') {
    return current;
  }

  // If result is not a string, return the path as fallback
  return path;
}

/**
 * Load translations for a given locale.
 * Uses the dictionary loader for efficient code-splitting.
 */
export async function getTranslations(locale: Locale): Promise<Record<string, unknown>> {
  const { getDictionary } = await import('./dictionaries');
  return getDictionary(locale);
}

/**
 * Validate if a string is a supported locale
 */
export function isValidLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

/**
 * Get locale from a string value, falling back to default locale
 */
export function resolveLocale(value: string | undefined | null): Locale {
  if (value && isValidLocale(value)) {
    return value;
  }
  return defaultLocale;
}

/**
 * Interpolate dynamic values into a translation string.
 *
 * @example
 * interpolate("© {year} Vidnoria", { year: "2024" }) // "© 2024 Vidnoria"
 */
export function interpolate(
  template: string,
  values: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    return key in values ? String(values[key]) : match;
  });
}

/**
 * Create a translation helper function (t) for a specific locale's dictionary.
 * This is the primary way to access translations in components.
 *
 * @example
 * const dict = await getTranslations('en');
 * const t = createTranslator(dict);
 * t('nav.home') // "Home"
 * t('footer.copyright', { year: '2024' }) // "© 2024 Vidnoria. All rights reserved."
 */
export function createTranslator(dictionary: Record<string, unknown>) {
  return function t(
    key: string,
    values?: Record<string, string | number>
  ): string {
    const translation = getNestedValue(dictionary, key);

    if (values) {
      return interpolate(translation, values);
    }

    return translation;
  };
}
