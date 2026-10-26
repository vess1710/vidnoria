import type { Metadata } from 'next';
import { Locale, locales } from '@/lib/i18n';
import { readJSON, contentPath } from '@/lib/storage';

export const SITE_BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://vidnoria.com').replace(/\/+$/, '');

export interface SeoPageConfig {
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  keywords?: Record<Locale, string[]>;
  canonicalPath?: string;
}

export interface SeoPagesFile {
  pages: Record<string, SeoPageConfig>;
}

export function normalizeSubPath(subPath: string): string {
  if (!subPath || subPath === '/') return '';
  return subPath.startsWith('/') ? subPath.replace(/\/+$/, '') : `/${subPath.replace(/\/+$/, '')}`;
}

/**
 * Generates self-referencing canonical URL and hreflang alternates for TR, EN, AR,
 * plus x-default pointing to /tr (matching root page redirect behavior).
 */
export function buildLocalizedAlternates(locale: Locale, subPath = '') {
  const cleanSub = normalizeSubPath(subPath);
  const validLocale: Locale = locales.includes(locale) ? locale : 'tr';

  return {
    canonical: `${SITE_BASE_URL}/${validLocale}${cleanSub}`,
    languages: {
      tr: `${SITE_BASE_URL}/tr${cleanSub}`,
      en: `${SITE_BASE_URL}/en${cleanSub}`,
      ar: `${SITE_BASE_URL}/ar${cleanSub}`,
      'x-default': `${SITE_BASE_URL}/tr${cleanSub}`,
    },
  };
}

/**
 * Builds complete Next.js Metadata for any localized Vidnoria page, merging
 * content/seo/pages.json with any admin-approved SEO overrides.
 */
export async function buildPageMetadata(
  locale: Locale,
  pageKey: string,
  subPath = '',
  fallback?: { title?: string; description?: string; keywords?: string[] }
): Promise<Metadata> {
  const validLocale: Locale = locales.includes(locale) ? locale : 'tr';
  const seoData = await readJSON<SeoPagesFile>(contentPath('seo', 'pages.json'));
  const overrides = await readJSON<Record<string, Partial<SeoPageConfig>>>(contentPath('seo', 'overrides.json'));

  const basePage = seoData?.pages?.[pageKey];
  const overridePage = overrides?.[pageKey];

  const title =
    overridePage?.title?.[validLocale] ||
    basePage?.title?.[validLocale] ||
    fallback?.title ||
    basePage?.title?.tr ||
    'Vidnoria';

  const description =
    overridePage?.description?.[validLocale] ||
    basePage?.description?.[validLocale] ||
    fallback?.description ||
    basePage?.description?.tr ||
    '';

  const keywords =
    overridePage?.keywords?.[validLocale] ||
    basePage?.keywords?.[validLocale] ||
    fallback?.keywords ||
    [];

  const effectivePath = overridePage?.canonicalPath ?? basePage?.canonicalPath ?? subPath;
  const alternates = buildLocalizedAlternates(validLocale, effectivePath);
  const ogLocale = validLocale === 'ar' ? 'ar_SA' : validLocale === 'tr' ? 'tr_TR' : 'en_US';

  return {
    title: {
      absolute: title,
    },
    description,
    keywords,
    alternates,
    openGraph: {
      title,
      description,
      url: alternates.canonical,
      siteName: 'Vidnoria',
      locale: ogLocale,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
