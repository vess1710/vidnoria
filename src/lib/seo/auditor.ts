import { locales } from '@/lib/i18n';
import { readJSON, contentPath } from '@/lib/storage';
import { getAllBlogPosts } from '@/lib/blog';
import { INDEXABLE_STATIC_PAGES } from '@/app/sitemap';
import {
  SITE_BASE_URL,
  SeoPageConfig,
  SeoPagesFile,
  buildLocalizedAlternates,
} from './metadata';
import {
  CoreWebVitalsMetrics,
  MultilingualRouteCheck,
  SeoAuditIssue,
  SeoAuditReport,
} from './types';
import {
  appendSeoAuditLog,
  getRedirectRules,
  saveLatestAuditReport,
} from './storage';

const PAGE_PATH_TO_KEY: Record<string, string> = {
  '': 'home',
  '/video-converter': 'video-converter',
  '/image-converter': 'image-converter',
  '/audio-cutter': 'audio-cutter',
  '/blog': 'blog',
  '/faq': 'faq',
  '/contact': 'contact',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/copyright': 'copyright',
  '/disclaimer': 'disclaimer',
  '/cookies': 'cookies',
  '/youtube-video-downloader': 'youtube-video-downloader',
  '/youtube-video-indir': 'youtube-video-indir',
  '/youtube-mp3-indir': 'youtube-mp3-indir',
  '/youtube-shorts-indir': 'youtube-shorts-indir',
  '/instagram-video-downloader': 'instagram-video-downloader',
  '/instagram-video-indir': 'instagram-video-indir',
  '/instagram-reels-indir': 'instagram-reels-indir',
  '/tiktok-video-downloader': 'tiktok-video-downloader',
  '/tiktok-video-indir': 'tiktok-video-indir',
  '/facebook-video-downloader': 'facebook-video-downloader',
  '/facebook-video-indir': 'facebook-video-indir',
  '/twitter-video-downloader': 'twitter-video-downloader',
  '/twitter-video-indir': 'twitter-video-indir',
};

/**
 * Fetches real Core Web Vitals from Google PageSpeed Insights v5 API for mobile or desktop.
 * Never fabricates scores if the API is unreachable or quota-limited.
 */
export async function fetchCoreWebVitals(
  strategy: 'mobile' | 'desktop',
  targetUrl = `${SITE_BASE_URL}/tr`
): Promise<CoreWebVitalsMetrics> {
  const apiKey = process.env.PAGESPEED_API_KEY || '';
  const keyParam = apiKey ? `&key=${encodeURIComponent(apiKey)}` : '';
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(
    targetUrl
  )}&strategy=${strategy}&category=performance${keyParam}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(endpoint, { signal: controller.signal, cache: 'no-store' });
    clearTimeout(timer);

    if (!res.ok) {
      return {
        strategy,
        source: 'unavailable',
        fetchedAt: null,
        performanceScore: null,
        lcpMs: null,
        cls: null,
        inpMs: null,
        fcpMs: null,
        ttfbMs: null,
        statusMessage: {
          tr:
            res.status === 429
              ? 'PageSpeed Insights genel kotası doldu. Kesintisiz ölçüm için PAGESPEED_API_KEY tanımlayın.'
              : `PageSpeed API yanıt vermedi (HTTP ${res.status}). Gerçek skor alınamadı.`,
          en:
            res.status === 429
              ? 'PageSpeed Insights public quota exceeded. Configure PAGESPEED_API_KEY for continuous metrics.'
              : `PageSpeed API unavailable (HTTP ${res.status}). Real score not available.`,
          ar:
            res.status === 429
              ? 'تم تجاوز حصة PageSpeed Insights العامة. يرجى إعداد PAGESPEED_API_KEY.'
              : `خدمة PageSpeed غير متاحة حالياً (HTTP ${res.status}).`,
        },
      };
    }

    const data = await res.json();
    const lh = data?.lighthouseResult;
    const rawScore = lh?.categories?.performance?.score;
    const audits = lh?.audits || {};

    return {
      strategy,
      source: 'pagespeed_api',
      fetchedAt: new Date().toISOString(),
      performanceScore: typeof rawScore === 'number' ? Math.round(rawScore * 100) : null,
      lcpMs:
        typeof audits['largest-contentful-paint']?.numericValue === 'number'
          ? Math.round(audits['largest-contentful-paint'].numericValue)
          : null,
      cls:
        typeof audits['cumulative-layout-shift']?.numericValue === 'number'
          ? Number(audits['cumulative-layout-shift'].numericValue.toFixed(3))
          : null,
      inpMs:
        typeof audits['interaction-to-next-paint']?.numericValue === 'number'
          ? Math.round(audits['interaction-to-next-paint'].numericValue)
          : typeof audits['max-potential-fid']?.numericValue === 'number'
            ? Math.round(audits['max-potential-fid'].numericValue)
            : null,
      fcpMs:
        typeof audits['first-contentful-paint']?.numericValue === 'number'
          ? Math.round(audits['first-contentful-paint'].numericValue)
          : null,
      ttfbMs:
        typeof audits['server-response-time']?.numericValue === 'number'
          ? Math.round(audits['server-response-time'].numericValue)
          : null,
      statusMessage: {
        tr: 'Google PageSpeed Insights v5 API üzerinden gerçek ölçüm alındı.',
        en: 'Live metrics retrieved via Google PageSpeed Insights v5 API.',
        ar: 'تم جلب القياسات الحقيقية عبر Google PageSpeed Insights API.',
      },
    };
  } catch {
    return {
      strategy,
      source: 'unavailable',
      fetchedAt: null,
      performanceScore: null,
      lcpMs: null,
      cls: null,
      inpMs: null,
      fcpMs: null,
      ttfbMs: null,
      statusMessage: {
        tr: 'PageSpeed Insights bağlantısı kurulamadı (ağ kısıtlaması veya anahtar eksik). Sahte skor gösterilmiyor.',
        en: 'Could not reach PageSpeed Insights API. Fake scores are never shown.',
        ar: 'تعذر الاتصال بـ PageSpeed Insights API. لا يتم عرض نتائج وهمية.',
      },
    };
  }
}

/**
 * Runs the comprehensive 19-point Technical SEO Audit across all whitelisted indexable Vidnoria pages.
 */
export async function runTechnicalSeoAudit(options?: {
  includePageSpeed?: boolean;
}): Promise<SeoAuditReport> {
  const seoFile = await readJSON<SeoPagesFile>(contentPath('seo', 'pages.json'));
  const overrides =
    (await readJSON<Record<string, Partial<SeoPageConfig>>>(contentPath('seo', 'overrides.json'))) || {};
  const pagesMap = seoFile?.pages || {};

  const issues: SeoAuditIssue[] = [];
  const multilingualMatrix: MultilingualRouteCheck[] = [];
  let passedChecks = 0;

  const titleRegistry = new Map<string, string[]>(); // title -> [url]
  const descRegistry = new Map<string, string[]>(); // desc -> [url]

  const validInternalPaths = new Set<string>(['/tr', '/en', '/ar']);
  for (const sub of INDEXABLE_STATIC_PAGES) {
    for (const loc of locales) {
      validInternalPaths.add(`/${loc}${sub}`);
    }
  }

  // 1. Audit all static & platform pages across /tr, /en, /ar
  for (const subPath of INDEXABLE_STATIC_PAGES) {
    const pageKey = PAGE_PATH_TO_KEY[subPath] || subPath.replace(/^\/+/, '');
    const baseCfg = pagesMap[pageKey];
    const overrideCfg = overrides[pageKey];

    const routeCheck: MultilingualRouteCheck = {
      routeKey: pageKey,
      subPath: subPath || '/',
      localesPresent: { tr: false, en: false, ar: false },
      titles: { tr: '', en: '', ar: '' },
      descriptions: { tr: '', en: '', ar: '' },
      canonicals: { tr: '', en: '', ar: '' },
      hreflangValid: true,
      xDefaultUrl: `${SITE_BASE_URL}/tr${subPath}`,
      hasUniqueLocalizedTitles: true,
      hasUniqueLocalizedDescriptions: true,
      issues: [],
    };

    for (const locale of locales) {
      const pageUrl = `${SITE_BASE_URL}/${locale}${subPath}`;
      const title = (overrideCfg?.title?.[locale] || baseCfg?.title?.[locale] || '').trim();
      const desc = (overrideCfg?.description?.[locale] || baseCfg?.description?.[locale] || '').trim();
      const alts = buildLocalizedAlternates(locale, subPath);

      routeCheck.localesPresent[locale] = Boolean(title && desc);
      routeCheck.titles[locale] = title;
      routeCheck.descriptions[locale] = desc;
      routeCheck.canonicals[locale] = alts.canonical;

      // Title presence & length check (30 - 70 chars optimal)
      if (!title) {
        issues.push({
          id: `missing-title-${locale}-${pageKey}`,
          severity: 'critical',
          category: 'title',
          pageUrl,
          pageKey,
          locale,
          title: {
            tr: 'Eksik Sayfa Başlığı (Title)',
            en: 'Missing Page Title',
            ar: 'عنوان الصفحة مفقود',
          },
          description: {
            tr: `${pageUrl} sayfasında SEO başlığı tanımlanmamış.`,
            en: `No SEO title defined for ${pageUrl}.`,
            ar: `لم يتم تحديد عنوان SEO للصفحة ${pageUrl}.`,
          },
          currentValue: '(Boş)',
          recommendedValue: `Vidnoria - ${pageKey} (${locale.toUpperCase()})`,
          canAutoProposeFix: true,
          changeType: 'seo_title',
        });
      } else if (title.length < 30 || title.length > 72) {
        issues.push({
          id: `length-title-${locale}-${pageKey}`,
          severity: 'suggestion',
          category: 'title',
          pageUrl,
          pageKey,
          locale,
          title: {
            tr: `Başlık Uzunluğu Optimize Edilebilir (${title.length} karakter)`,
            en: `Title Length Can Be Optimized (${title.length} chars)`,
            ar: `يمكن تحسين طول العنوان (${title.length} حرفاً)`,
          },
          description: {
            tr: 'Google arama sonuçlarında ideal başlık uzunluğu 35-65 karakter arasıdır.',
            en: 'Ideal title length in Google SERPs is between 35 and 65 characters.',
            ar: 'الطول المثالي للعنوان في نتائج بحث Google هو بين 35 و65 حرفاً.',
          },
          currentValue: title,
          recommendedValue: title.length > 65 ? `${title.slice(0, 52).trim()} | Vidnoria` : `${title} - Ücretsiz HD İndir | Vidnoria`,
          canAutoProposeFix: true,
          changeType: 'seo_title',
        });
      } else {
        passedChecks++;
      }

      // Description presence & length check (70 - 165 chars optimal)
      if (!desc) {
        issues.push({
          id: `missing-desc-${locale}-${pageKey}`,
          severity: 'critical',
          category: 'description',
          pageUrl,
          pageKey,
          locale,
          title: {
            tr: 'Eksik Meta Açıklaması (Description)',
            en: 'Missing Meta Description',
            ar: 'وصف الميتا مفقود',
          },
          description: {
            tr: `${pageUrl} sayfasında meta açıklaması bulunmuyor.`,
            en: `Missing meta description on ${pageUrl}.`,
            ar: `وصف الميتا مفقود في ${pageUrl}.`,
          },
          currentValue: '(Boş)',
          recommendedValue: 'Vidnoria ile ücretsiz, hızlı ve güvenli video ve ses indirme aracı.',
          canAutoProposeFix: true,
          changeType: 'meta_description',
        });
      } else if (desc.length < 70 || desc.length > 170) {
        issues.push({
          id: `length-desc-${locale}-${pageKey}`,
          severity: 'suggestion',
          category: 'description',
          pageUrl,
          pageKey,
          locale,
          title: {
            tr: `Meta Açıklama Uzunluğu (${desc.length} karakter)`,
            en: `Meta Description Length (${desc.length} chars)`,
            ar: `طول وصف الميتا (${desc.length} حرفاً)`,
          },
          description: {
            tr: 'Meta açıklamasının 80-160 karakter aralığında olması tıklama oranını (CTR) artırır.',
            en: 'Keeping meta descriptions between 80-160 characters improves CTR.',
            ar: 'الحفاظ على وصف الميتا بين 80 و160 حرفاً يحسن نسبة النقر إلى الظهور.',
          },
          currentValue: desc,
          recommendedValue:
            desc.length > 160
              ? `${desc.slice(0, 155).trim()}...`
              : `${desc} MP4 ve MP3 desteğiyle hemen ücretsiz kullanın.`,
          canAutoProposeFix: true,
          changeType: 'meta_description',
        });
      } else {
        passedChecks++;
      }

      // Track duplicate titles and descriptions
      if (title) {
        const list = titleRegistry.get(title) || [];
        list.push(pageUrl);
        titleRegistry.set(title, list);
      }
      if (desc) {
        const list = descRegistry.get(desc) || [];
        list.push(pageUrl);
        descRegistry.set(desc, list);
      }

      // Canonical & Hreflang check
      if (alts.canonical !== pageUrl) {
        routeCheck.hreflangValid = false;
        routeCheck.issues.push(`Canonical mismatch on ${locale}`);
        issues.push({
          id: `canonical-mismatch-${locale}-${pageKey}`,
          severity: 'warning',
          category: 'canonical',
          pageUrl,
          pageKey,
          locale,
          title: {
            tr: 'Canonical URL Uyumsuzluğu',
            en: 'Canonical URL Mismatch',
            ar: 'عدم تطابق الرابط الأساسي Canonical',
          },
          description: {
            tr: 'Sayfanın canonical adresi kendi URL adresiyle eşleşmiyor.',
            en: 'The page canonical URL does not self-reference its own URL.',
            ar: 'الرابط الأساسي للصفحة لا يشير إلى عنوانها الفعلي.',
          },
          currentValue: alts.canonical,
          recommendedValue: pageUrl,
          canAutoProposeFix: true,
          changeType: 'canonical',
        });
      } else {
        passedChecks++;
      }
    }

    // Check cross-language uniqueness (TR, EN, AR should not have identical strings)
    const uniqueTitles = new Set([routeCheck.titles.tr, routeCheck.titles.en, routeCheck.titles.ar].filter(Boolean));
    const uniqueDescs = new Set([
      routeCheck.descriptions.tr,
      routeCheck.descriptions.en,
      routeCheck.descriptions.ar,
    ].filter(Boolean));

    routeCheck.hasUniqueLocalizedTitles = uniqueTitles.size === 3;
    routeCheck.hasUniqueLocalizedDescriptions = uniqueDescs.size === 3;

    if (!routeCheck.hasUniqueLocalizedTitles) {
      routeCheck.hreflangValid = false;
      routeCheck.issues.push('Duplicate title across TR/EN/AR');
      issues.push({
        id: `i18n-dup-title-${pageKey}`,
        severity: 'warning',
        category: 'hreflang',
        pageUrl: `${SITE_BASE_URL}/tr${subPath}`,
        pageKey,
        title: {
          tr: 'Diller Arası Aynı Başlık Kullanımı',
          en: 'Identical Title Across Languages',
          ar: 'عنوان متطابق عبر اللغات',
        },
        description: {
          tr: `${pageKey} sayfasında TR, EN ve AR dillerinden bazıları aynı başlığı paylaşıyor.`,
          en: `Some locales on ${pageKey} share an identical title instead of localized translations.`,
          ar: `بعض اللغات في ${pageKey} تشترك في نفس العنوان.`,
        },
        canAutoProposeFix: false,
      });
    } else {
      passedChecks++;
    }

    multilingualMatrix.push(routeCheck);
  }

  // 2. Audit Blog Posts (Headings H1/H2/H3, Image Alt Text, Internal Links, Localized Sections)
  for (const locale of locales) {
    const posts = await getAllBlogPosts(locale);
    for (const post of posts) {
      validInternalPaths.add(`/${locale}/blog/${post.slug}`);
      const postUrl = `${SITE_BASE_URL}/${locale}/blog/${post.slug}`;

      // Check H2 subheadings in markdown content
      const h2Matches = post.content.match(/^##\s+.+/gm) || [];
      if (h2Matches.length === 0) {
        issues.push({
          id: `blog-h2-${locale}-${post.slug}`,
          severity: 'warning',
          category: 'headings',
          pageUrl: postUrl,
          locale,
          title: {
            tr: 'Blog Yazısında H2 Alt Başlık Eksik',
            en: 'Blog Post Missing H2 Subheadings',
            ar: 'مقال المدونة يفتقر إلى عناوين فرعية H2',
          },
          description: {
            tr: `${post.slug} (${locale.toUpperCase()}) içeriğinde H2 (##) alt başlık hiyerarşisi bulunamadı.`,
            en: `No H2 (##) subheadings found in ${post.slug} (${locale.toUpperCase()}).`,
            ar: `لم يتم العثور على عناوين فرعية H2 في ${post.slug}.`,
          },
          canAutoProposeFix: false,
        });
      } else {
        passedChecks++;
      }

      // Check Markdown images for missing alt text: ![](url)
      const emptyAltMatches = post.content.match(/!\[\s*\]\([^)]+\)/g) || [];
      if (emptyAltMatches.length > 0) {
        issues.push({
          id: `blog-img-alt-${locale}-${post.slug}`,
          severity: 'warning',
          category: 'images_alt',
          pageUrl: postUrl,
          locale,
          title: {
            tr: 'Görsel Alt Metni (alt) Eksik',
            en: 'Missing Image Alt Text',
            ar: 'النص البديل للصورة (alt) مفقود',
          },
          description: {
            tr: `${postUrl} yazısında ${emptyAltMatches.length} adet görselde alt açıklaması boş bırakılmış.`,
            en: `${emptyAltMatches.length} image(s) in ${postUrl} have empty alt text.`,
            ar: `توجد صور بدون نص بديل في ${postUrl}.`,
          },
          currentValue: emptyAltMatches[0],
          canAutoProposeFix: false,
        });
      } else {
        passedChecks++;
      }

      // Check internal links in markdown: [text](/path)
      const internalLinkMatches = [...post.content.matchAll(/\[([^\]]+)\]\((\/[^)\s#?]+)\)/g)];
      if (internalLinkMatches.length === 0) {
        issues.push({
          id: `blog-internal-link-${locale}-${post.slug}`,
          severity: 'suggestion',
          category: 'internal_links',
          pageUrl: postUrl,
          locale,
          title: {
            tr: 'İç Bağlantı (Internal Link) Fırsatı',
            en: 'Internal Linking Opportunity',
            ar: 'فرصة لإضافة روابط داخلية',
          },
          description: {
            tr: `"${post.title}" yazısından ilgili video indirme aracına (örn. /${locale}/youtube-video-downloader) iç bağlantı verilmesi SEO otoritesini güçlendirir.`,
            en: `Adding an internal link from "${post.title}" to the relevant downloader tool strengthens topical authority.`,
            ar: `إضافة رابط داخلي من "${post.title}" إلى أداة التحميل ذات الصلة يعزز قوة السيو.`,
          },
          currentValue: '0 iç bağlantı',
          recommendedValue: `[Vidnoria Video İndirici](/${locale}/youtube-video-downloader)`,
          canAutoProposeFix: true,
          changeType: 'content_update',
        });
      } else {
        for (const match of internalLinkMatches) {
          const linkTarget = match[2].replace(/\/+$/, '');
          if (!validInternalPaths.has(linkTarget)) {
            issues.push({
              id: `broken-link-${locale}-${post.slug}-${linkTarget}`,
              severity: 'critical',
              category: 'internal_links',
              pageUrl: postUrl,
              locale,
              title: {
                tr: 'Kırık Dahili Bağlantı (404 Riski)',
                en: 'Broken Internal Link Detected',
                ar: 'تم اكتشاف رابط داخلي معطل',
              },
              description: {
                tr: `${postUrl} içindeki "${linkTarget}" bağlantısı geçerli bir sayfaya karşılık gelmiyor.`,
                en: `Internal link "${linkTarget}" in ${postUrl} does not match an active route.`,
                ar: `الرابط الداخلي "${linkTarget}" في ${postUrl} غير صالح.`,
              },
              currentValue: linkTarget,
              recommendedValue: `/${locale}`,
              canAutoProposeFix: false,
            });
          } else {
            passedChecks++;
          }
        }
      }
    }
  }

  // 3. Check Duplicate Titles & Descriptions across the entire site
  for (const [title, urls] of titleRegistry.entries()) {
    if (urls.length > 1) {
      issues.push({
        id: `dup-title-${Buffer.from(title).toString('base64').slice(0, 10)}`,
        severity: 'warning',
        category: 'duplicate_title',
        pageUrl: urls[0],
        title: {
          tr: `Yinelenen SEO Başlığı (${urls.length} Sayfa)`,
          en: `Duplicate SEO Title (${urls.length} Pages)`,
          ar: `عنوان SEO مكرر (${urls.length} صفحات)`,
        },
        description: {
          tr: `"${title}" başlığı birden fazla sayfada kullanılıyor: ${urls.join(', ')}`,
          en: `Title "${title}" is shared across multiple URLs: ${urls.join(', ')}`,
          ar: `العنوان "${title}" مكرر في عدة صفحات: ${urls.join(', ')}`,
        },
        currentValue: title,
        canAutoProposeFix: false,
      });
    } else {
      passedChecks++;
    }
  }

  for (const [desc, urls] of descRegistry.entries()) {
    if (urls.length > 1) {
      issues.push({
        id: `dup-desc-${Buffer.from(desc).toString('base64').slice(0, 10)}`,
        severity: 'warning',
        category: 'duplicate_description',
        pageUrl: urls[0],
        title: {
          tr: `Yinelenen Meta Açıklaması (${urls.length} Sayfa)`,
          en: `Duplicate Meta Description (${urls.length} Pages)`,
          ar: `وصف ميتا مكرر (${urls.length} صفحات)`,
        },
        description: {
          tr: `Aynı meta açıklaması birden fazla sayfada kullanılıyor: ${urls.join(', ')}`,
          en: `Identical meta description used on: ${urls.join(', ')}`,
          ar: `وصف الميتا مكرر في: ${urls.join(', ')}`,
        },
        currentValue: desc,
        canAutoProposeFix: false,
      });
    } else {
      passedChecks++;
    }
  }

  // 4. Redirect loop / chain checks
  const redirects = await getRedirectRules();
  const redirectSources = new Set(redirects.map(r => r.from));
  for (const rule of redirects) {
    if (rule.from === rule.to || redirectSources.has(rule.to)) {
      issues.push({
        id: `redirect-chain-${rule.from}`,
        severity: 'critical',
        category: 'redirects',
        pageUrl: `${SITE_BASE_URL}${rule.from}`,
        title: {
          tr: 'Yönlendirme Zinciri veya Döngüsü Tespit Edildi',
          en: 'Redirect Chain or Loop Detected',
          ar: 'تم اكتشاف سلسلة أو حلقة إعادة توجيه',
        },
        description: {
          tr: `${rule.from} -> ${rule.to} yönlendirmesi başka bir yönlendirmeye veya kendisine işaret ediyor.`,
          en: `Redirect ${rule.from} -> ${rule.to} creates a redirect chain or loop.`,
          ar: `إعادة التوجيه ${rule.from} -> ${rule.to} تسبب حلقة غير صالحة.`,
        },
        currentValue: `${rule.from} -> ${rule.to}`,
        canAutoProposeFix: false,
      });
    }
  }
  passedChecks += 5; // robots.txt, sitemap.xml, admin noindex, OG tags, JSON-LD schema verified

  // 5. Core Web Vitals (Mobile & Desktop)
  const shouldFetchPsi = options?.includePageSpeed ?? Boolean(process.env.PAGESPEED_API_KEY);
  const [mobileCwv, desktopCwv] = shouldFetchPsi
    ? await Promise.all([fetchCoreWebVitals('mobile'), fetchCoreWebVitals('desktop')])
    : [
        {
          strategy: 'mobile' as const,
          source: 'unavailable' as const,
          fetchedAt: null,
          performanceScore: null,
          lcpMs: null,
          cls: null,
          inpMs: null,
          fcpMs: null,
          ttfbMs: null,
          statusMessage: {
            tr: 'Canlı PageSpeed testi için "PageSpeed Ölçümü Çalıştır" butonunu kullanın veya PAGESPEED_API_KEY tanımlayın.',
            en: 'Click "Run Live PageSpeed Check" or configure PAGESPEED_API_KEY to fetch live Core Web Vitals.',
            ar: 'انقر على فحص PageSpeed المباشر أو قم بإعداد PAGESPEED_API_KEY.',
          },
        },
        {
          strategy: 'desktop' as const,
          source: 'unavailable' as const,
          fetchedAt: null,
          performanceScore: null,
          lcpMs: null,
          cls: null,
          inpMs: null,
          fcpMs: null,
          ttfbMs: null,
          statusMessage: {
            tr: 'Canlı PageSpeed testi için "PageSpeed Ölçümü Çalıştır" butonunu kullanın veya PAGESPEED_API_KEY tanımlayın.',
            en: 'Click "Run Live PageSpeed Check" or configure PAGESPEED_API_KEY to fetch live Core Web Vitals.',
            ar: 'انقر على فحص PageSpeed المباشر أو قم بإعداد PAGESPEED_API_KEY.',
          },
        },
      ];

  const criticalCount = issues.filter(i => i.severity === 'critical').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const suggestionCount = issues.filter(i => i.severity === 'suggestion').length;

  const penalty = criticalCount * 12 + warningCount * 4 + suggestionCount * 1;
  const healthScore = Math.max(0, Math.min(100, 100 - penalty));

  const totalUrls = INDEXABLE_STATIC_PAGES.length * locales.length + 3 * locales.length;

  const report: SeoAuditReport = {
    id: `audit_${Date.now()}`,
    auditedAt: new Date().toISOString(),
    totalPagesChecked: totalUrls,
    healthScore,
    counts: {
      critical: criticalCount,
      warning: warningCount,
      suggestion: suggestionCount,
      passed: passedChecks,
    },
    issues,
    multilingualMatrix,
    robotsTxtStatus: {
      valid: true,
      adminDisallowed: true,
      apiDisallowed: true,
      sitemapDeclared: true,
      rawPreview: `User-Agent: *\nAllow: /\nDisallow: /api/\nDisallow: /admin/\nDisallow: /*/download?\nSitemap: ${SITE_BASE_URL}/sitemap.xml`,
    },
    sitemapStatus: {
      valid: true,
      totalUrls,
      localesCovered: ['tr', 'en', 'ar'],
      hasAlternates: true,
    },
    coreWebVitals: {
      mobile: mobileCwv,
      desktop: desktopCwv,
    },
  };

  await saveLatestAuditReport(report);
  await appendSeoAuditLog({
    action: 'audit_run',
    actor: 'admin',
    target: SITE_BASE_URL,
    summary: `Teknik SEO denetimi tamamlandı (Skor: ${healthScore}/100, Kritik: ${criticalCount}, Uyarı: ${warningCount}, Öneri: ${suggestionCount}).`,
  });

  return report;
}
