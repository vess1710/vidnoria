import { Locale } from '@/lib/i18n';
import { SeoKeywordCategory, SeoKeywordItem } from './types';
import { getStoredKeywords, saveStoredKeywords } from './storage';
import { readJSON, contentPath } from '@/lib/storage';
import { SeoPagesFile } from './metadata';

// ============================================================================
// Vidnoria SEO Manager - Keyword Management Engine
// ============================================================================

export const SEED_KEYWORDS: Omit<
  SeoKeywordItem,
  'id' | 'inTitle' | 'inDescription' | 'inH1' | 'inSlug' | 'optimizationScore' | 'gscClicks' | 'gscImpressions' | 'gscCtr' | 'gscPosition' | 'gscPositionDelta'
>[] = [
  // Türkçe Hedefler
  {
    keyword: 'YouTube video indir',
    locale: 'tr',
    category: 'priority',
    targetPath: '/tr/youtube-video-downloader',
    notes: {
      tr: 'En yüksek arama hacmine sahip ana hedef kelime.',
      en: 'Primary high-volume target keyword in Turkish.',
      ar: 'الكلمة المفتاحية الرئيسية الأعلى في حجم البحث بالتركية.',
    },
  },
  {
    keyword: 'YouTube MP3 dönüştürücü',
    locale: 'tr',
    category: 'priority',
    targetPath: '/tr/youtube-mp3-indir',
    notes: {
      tr: 'Müzik ve ses indirme niyetli ana hedef kelime.',
      en: 'Primary audio conversion target keyword.',
      ar: 'الكلمة المفتاحية الرئيسية لتحويل الصوت والموسيقى.',
    },
  },
  {
    keyword: 'Instagram video indir',
    locale: 'tr',
    category: 'priority',
    targetPath: '/tr/instagram-video-downloader',
  },
  {
    keyword: 'TikTok video indir',
    locale: 'tr',
    category: 'rising',
    targetPath: '/tr/tiktok-video-downloader',
  },
  {
    keyword: 'Facebook video indir',
    locale: 'tr',
    category: 'page_optimization',
    targetPath: '/tr/facebook-video-downloader',
  },
  {
    keyword: 'Twitter video indir',
    locale: 'tr',
    category: 'rising',
    targetPath: '/tr/twitter-video-downloader',
  },

  // İngilizce Hedefler
  {
    keyword: 'Online video downloader',
    locale: 'en',
    category: 'priority',
    targetPath: '/en',
  },
  {
    keyword: 'Free video downloader',
    locale: 'en',
    category: 'priority',
    targetPath: '/en',
  },
  {
    keyword: 'Video to MP3 converter',
    locale: 'en',
    category: 'priority',
    targetPath: '/en/video-converter',
  },
  {
    keyword: 'Instagram video downloader',
    locale: 'en',
    category: 'rising',
    targetPath: '/en/instagram-video-downloader',
  },
  {
    keyword: 'TikTok video downloader',
    locale: 'en',
    category: 'rising',
    targetPath: '/en/tiktok-video-downloader',
  },

  // Arapça Hedefler
  {
    keyword: 'تحميل فيديو من يوتيوب',
    locale: 'ar',
    category: 'priority',
    targetPath: '/ar/youtube-video-downloader',
  },
  {
    keyword: 'تحميل فيديو من انستقرام',
    locale: 'ar',
    category: 'priority',
    targetPath: '/ar/instagram-video-downloader',
  },
  {
    keyword: 'تحميل فيديو من تيك توك',
    locale: 'ar',
    category: 'rising',
    targetPath: '/ar/tiktok-video-downloader',
  },
  {
    keyword: 'تحويل الفيديو إلى MP3',
    locale: 'ar',
    category: 'priority',
    targetPath: '/ar/youtube-mp3-indir',
  },
];

/**
 * Checks on-page optimization signals for a keyword on its target landing page.
 */
export async function evaluateKeywordOptimization(
  keyword: string,
  targetPath: string,
  locale: Locale
): Promise<{
  inTitle: boolean;
  inDescription: boolean;
  inH1: boolean;
  inSlug: boolean;
  optimizationScore: number;
}> {
  const seoFile = await readJSON<SeoPagesFile>(contentPath('seo', 'pages.json'));
  const pages = seoFile?.pages || {};

  // Find page key matching the target path
  const cleanPath = targetPath.replace(new RegExp(`^/${locale}`), '') || '/';
  const pageKey =
    Object.keys(pages).find(k => (pages[k].canonicalPath || '') === cleanPath || `/${k}` === cleanPath) ||
    'home';

  const page = pages[pageKey] || pages.home;
  const title = (page?.title?.[locale] || '').toLowerCase();
  const desc = (page?.description?.[locale] || '').toLowerCase();
  const kwLower = keyword.toLowerCase();

  const inTitle = title.includes(kwLower);
  const inDescription = desc.includes(kwLower);
  const inH1 = inTitle; // Platform and hero templates render page title as H1
  const inSlug = targetPath.toLowerCase().includes(encodeURIComponent(kwLower)) ||
    targetPath.toLowerCase().includes(kwLower.replace(/\s+/g, '-'));

  let score = 20; // baseline
  if (inTitle) score += 35;
  if (inDescription) score += 25;
  if (inH1) score += 10;
  if (inSlug) score += 10;

  return {
    inTitle,
    inDescription,
    inH1,
    inSlug,
    optimizationScore: Math.min(100, score),
  };
}

/**
 * Loads keywords, initializes seeds if store is empty, and computes on-page optimization.
 */
export async function getManagedKeywords(): Promise<SeoKeywordItem[]> {
  let stored = await getStoredKeywords();

  if (stored.length === 0) {
    const initialized: SeoKeywordItem[] = [];
    for (const seed of SEED_KEYWORDS) {
      const id = `kw_${seed.locale}_${seed.keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
      const opt = await evaluateKeywordOptimization(seed.keyword, seed.targetPath, seed.locale);
      initialized.push({
        id,
        ...seed,
        ...opt,
        gscClicks: null,
        gscImpressions: null,
        gscCtr: null,
        gscPosition: null,
        gscPositionDelta: null,
      });
    }
    await saveStoredKeywords(initialized);
    stored = initialized;
  }

  return stored;
}

/**
 * Adds or updates a keyword in the manager.
 */
export async function upsertKeyword(item: {
  keyword: string;
  locale: Locale;
  category: SeoKeywordCategory;
  targetPath: string;
  notes?: Record<Locale, string>;
}): Promise<SeoKeywordItem> {
  const current = await getManagedKeywords();
  const id = `kw_${item.locale}_${item.keyword.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
  const opt = await evaluateKeywordOptimization(item.keyword, item.targetPath, item.locale);

  const existingIdx = current.findIndex(k => k.id === id);
  const fullItem: SeoKeywordItem = {
    id,
    ...item,
    ...opt,
    gscClicks: existingIdx >= 0 ? current[existingIdx].gscClicks : null,
    gscImpressions: existingIdx >= 0 ? current[existingIdx].gscImpressions : null,
    gscCtr: existingIdx >= 0 ? current[existingIdx].gscCtr : null,
    gscPosition: existingIdx >= 0 ? current[existingIdx].gscPosition : null,
    gscPositionDelta: existingIdx >= 0 ? current[existingIdx].gscPositionDelta : null,
  };

  const updated =
    existingIdx >= 0
      ? current.map((k, i) => (i === existingIdx ? fullItem : k))
      : [fullItem, ...current];

  await saveStoredKeywords(updated);
  return fullItem;
}

/**
 * Deletes a keyword by ID.
 */
export async function deleteKeyword(id: string): Promise<boolean> {
  const current = await getManagedKeywords();
  const filtered = current.filter(k => k.id !== id);
  if (filtered.length !== current.length) {
    await saveStoredKeywords(filtered);
    return true;
  }
  return false;
}

/**
 * Updates keyword list with real queries retrieved from GSC.
 */
export async function syncKeywordsFromGsc(queries: { query: string; locale: Locale; clicks: number; impressions: number; ctr: number; position: number }[]): Promise<number> {
  const current = await getManagedKeywords();
  let updatedCount = 0;

  for (const q of queries) {
    const match = current.find(k => k.keyword.toLowerCase() === q.query.toLowerCase() && k.locale === q.locale);
    if (match) {
      match.gscClicks = q.clicks;
      match.gscImpressions = q.impressions;
      match.gscCtr = q.ctr;
      match.gscPosition = q.position;
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    await saveStoredKeywords(current);
  }
  return updatedCount;
}
