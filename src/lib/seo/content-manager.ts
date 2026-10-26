import { Locale } from '@/lib/i18n';
import { getContentDrafts, saveContentDrafts, appendSeoAuditLog } from './storage';
import { SeoContentDraft } from './types';
import { createApprovalRequest } from './approvals';

// ============================================================================
// Vidnoria SEO Manager - Content Manager & Draft Engine
// ============================================================================

export interface ContentTopicSuggestion {
  id: string;
  topic: Record<Locale, string>;
  category: string;
  suggestedSlug: string;
  targetKeyword: Record<Locale, string>;
  expectedBenefit: Record<Locale, string>;
}

export const CURATED_TOPIC_SUGGESTIONS: ContentTopicSuggestion[] = [
  {
    id: 'topic_tiktok_watermark',
    category: 'guides',
    suggestedSlug: 'how-to-download-tiktok-videos-without-watermark',
    targetKeyword: {
      tr: 'tiktok video indir filigransız',
      en: 'download tiktok without watermark',
      ar: 'تحميل تيك توك بدون علامة مائية',
    },
    topic: {
      tr: 'TikTok Videolarını Filigransız ve HD Olarak İndirme Rehberi (2026)',
      en: 'How to Download TikTok Videos Without Watermark in HD (2026 Guide)',
      ar: 'دليل تحميل فيديوهات تيك توك بدون علامة مائية بجودة HD (2026)',
    },
    expectedBenefit: {
      tr: 'Aylık yüksek arama hacmine sahip filigransız TikTok indirme sorgularından organik trafik çeker.',
      en: 'Captures high-intent organic search queries for watermark-free video downloads.',
      ar: 'يجذب حركة بحث مجانية عالية من عمليات البحث عن إزالة العلامة المائية.',
    },
  },
  {
    id: 'topic_youtube_320kbps_audio',
    category: 'guides',
    suggestedSlug: 'youtube-to-mp3-high-quality-320kbps-guide',
    targetKeyword: {
      tr: 'youtube mp3 320kbps indir',
      en: 'youtube to mp3 320kbps high quality',
      ar: 'تحويل يوتيوب الى mp3 بجودة 320kbps',
    },
    topic: {
      tr: 'YouTube Videolarını 320kbps Yüksek Kalite MP3 Olarak Kaydetme',
      en: 'How to Extract High-Quality 320kbps MP3 Audio from YouTube',
      ar: 'كيفية استخراج صوت MP3 عالي الجودة 320kbps من فيديوهات يوتيوب',
    },
    expectedBenefit: {
      tr: 'Müzik ve ses kalitesine önem veren kitleyi /tr/youtube-mp3-indir sayfasına yönlendirir.',
      en: 'Directs audiophile and music download traffic to our dedicated audio cutter/converter tools.',
      ar: 'يوجه مستخدمي تحميل الموسيقى إلى أداة تحويل الصوت المخصصة.',
    },
  },
  {
    id: 'topic_instagram_reels_save',
    category: 'guides',
    suggestedSlug: 'save-instagram-reels-with-audio-guide',
    targetKeyword: {
      tr: 'instagram reels sesli indir',
      en: 'save instagram reels with audio',
      ar: 'حفظ ريلز انستقرام مع الصوت',
    },
    topic: {
      tr: 'Instagram Reels Videolarını Sesli ve Orijinal Kalitede İndirme',
      en: 'How to Save Instagram Reels with Original Audio on Phone & PC',
      ar: 'طريقة حفظ ريلز إنستغرام مع الصوت الأصلي على الهاتف والكمبيوتر',
    },
    expectedBenefit: {
      tr: 'Instagram Reels indirme trendlerinde otorite kazanarak organik sıralamayı yükseltir.',
      en: 'Ranks for trending Instagram Reels queries and builds internal authority to /instagram-video-downloader.',
      ar: 'يعزز الترتيب في استعلامات ريلز إنستغرام ويوجه الزوار للمنصة.',
    },
  },
];

/**
 * Creates a complete high-value trilingual content draft.
 * Operates rule-based out-of-the-box (no external AI key needed).
 * If GEMINI_API_KEY is available in the environment, it can optionally enrich the copy.
 */
export async function generateContentDraft(topicId: string): Promise<SeoContentDraft> {
  const suggestion = CURATED_TOPIC_SUGGESTIONS.find(s => s.id === topicId) || CURATED_TOPIC_SUGGESTIONS[0];
  const draftId = `draft_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const draft: SeoContentDraft = {
    id: draftId,
    slug: suggestion.suggestedSlug,
    targetKeyword: suggestion.targetKeyword,
    category: suggestion.category,
    status: 'pending_approval',
    title: suggestion.topic,
    seoTitle: {
      tr: `${suggestion.topic.tr} | Vidnoria Blog`,
      en: `${suggestion.topic.en} | Vidnoria Blog`,
      ar: `${suggestion.topic.ar} | مدونة فيدنوريا`,
    },
    seoDescription: {
      tr: `${suggestion.topic.tr}. Programsız, ücretsiz ve hızlı adımlarla en yüksek kalitede indirme yapmayı öğrenin.`,
      en: `Step-by-step guide on ${suggestion.topic.en}. Free, online, fast, and secure.`,
      ar: `دليل شامل خطوة بخطوة حول ${suggestion.topic.ar}. مجاني وسريع وآمن عبر الإنترنت.`,
    },
    outline: {
      tr: {
        h1: suggestion.topic.tr,
        h2s: [
          'Filigransız İndirme Neden Önemlidir?',
          'Adım Adım İndirme Rehberi',
          'Desteklenen Formatlar ve Kalite Seçenekleri',
          'Sıkça Sorulan Sorular',
        ],
        h3s: [
          'Telefona (Android & iOS) Kaydetme',
          'Bilgisayara (PC & Mac) İndirme',
          'Telif Hakları ve Yasal Kullanım',
        ],
      },
      en: {
        h1: suggestion.topic.en,
        h2s: [
          'Why Download Without Watermark?',
          'Step-by-Step Download Instructions',
          'Supported Resolutions & Quality Options',
          'Frequently Asked Questions',
        ],
        h3s: [
          'Saving on Mobile (iOS & Android)',
          'Downloading on Desktop (Mac & Windows)',
          'Fair Use & Copyright Guidelines',
        ],
      },
      ar: {
        h1: suggestion.topic.ar,
        h2s: [
          'لماذا يفضل التحميل بدون علامة مائية؟',
          'خطوات التحميل بالتفصيل',
          'الجودات والصيغ المدعومة',
          'الأسئلة الشائعة',
        ],
        h3s: [
          'الحفظ على الهاتف الذكي',
          'التحميل على أجهزة الكمبيوتر',
          'إرشادات حقوق النشر والاستخدام العادل',
        ],
      },
    },
    internalLinks: [
      {
        anchorText: {
          tr: 'Vidnoria Video İndirici',
          en: 'Vidnoria Video Downloader',
          ar: 'أداة تحميل الفيديو فيدنوريا',
        },
        targetPath: {
          tr: '/tr/tiktok-video-downloader',
          en: '/en/tiktok-video-downloader',
          ar: '/ar/tiktok-video-downloader',
        },
        reason: {
          tr: 'Okuyucuyu doğrudan indirme aracına yönlendirerek dönüşüm oranını artırır.',
          en: 'Funnel reader intent directly to the tool page to maximize conversions.',
          ar: 'توجيه القارئ إلى أداة التحميل مباشرة.',
        },
      },
    ],
    contentMarkdown: {
      tr: `<!-- content:tr -->
## Filigransız İndirme Neden Önemlidir?
Sosyal medya videolarını arşivlerken veya sunumlarda kullanırken logonun (filigranın) görüntü kalitesini bozması istenmez. Vidnoria, orijinal çözünürlüğü koruyarak en net video çıktısını almanızı sağlar.

## Adım Adım İndirme Rehberi
1. İndirmek istediğiniz videonun bağlantı adresini (URL) kopyalayın.
2. [Vidnoria Video İndirici](/tr/tiktok-video-downloader) sayfasına gidin ve kutucuğa yapıştırın.
3. **Çözümle** butonuna tıklayın ve istediğiniz MP4 çözünürlüğünü seçip indirmeyi başlatın.

### Telefona (Android & iOS) Kaydetme
Mobil tarayıcınızdan (Safari veya Chrome) linki yapıştırarak doğrudan Galeri veya İndirilenler klasörüne kaydedebilirsiniz.

### Telif Hakları ve Yasal Kullanım
İndirilen içeriklerin yalnızca kişisel kullanım amacıyla ve telif hakkı sahibinin izin verdiği ölçüde kullanılması önerilir.
`,
      en: `<!-- content:en -->
## Why Download Without Watermark?
Clean video clips without intrusive logos look professional for personal offline archives and presentations. Vidnoria preserves the pristine original quality with high-bitrate MP4 encoding.

## Step-by-Step Download Instructions
1. Copy the shareable link of the video from your social media app.
2. Visit the [Vidnoria Video Downloader](/en/tiktok-video-downloader) page and paste the link into the search box.
3. Click **Analyze**, select your preferred MP4 quality, and download instantly.

### Saving on Mobile (iOS & Android)
No app installation required. Use Safari on iOS or Chrome on Android to save directly to your Files or Camera Roll.

### Fair Use & Copyright Guidelines
Always respect content creators' rights. Only download videos you have explicit permission to access offline.
`,
      ar: `<!-- content:ar -->
## لماذا يفضل التحميل بدون علامة مائية؟
توفر الفيديوهات الخالية من الشعارات مظهراً نظيفاً واحترافياً عند المشاهدة دون اتصال بالإنترنت. تضمن فيدنوريا الحفاظ على الدقة الأصلية بالكامل.

## خطوات التحميل بالتفصيل
1. انسخ رابط الفيديو من التطبيق.
2. توجه إلى صفحة [أداة تحميل الفيديو فيدنوريا](/ar/tiktok-video-downloader) والصق الرابط في الصندوق المخصص.
3. اضغط على **تحليل** ثم اختر صيغة MP4 المناسبة وابدأ التحميل.

### الحفظ على الهاتف الذكي
لا حاجة لتثبيت أي تطبيقات إضافية، فالأداة تعمل مباشرة عبر متصفح الهاتف مع حفظ الملف في التنزيلات.
`,
    },
    createdAt: now,
    updatedAt: now,
  };

  // Automatically submit draft to the Semi-Automatic Approval Queue
  const approval = await createApprovalRequest({
    changeType: 'blog_publish',
    targetPage: `/blog/${draft.slug}`,
    pageKey: draft.slug,
    issueSummary: {
      tr: `Yeni SEO Blog Yazısı Onay Bekliyor: "${draft.title.tr}"`,
      en: `New SEO Blog Post Pending Approval: "${draft.title.en}"`,
      ar: `مقال مدونة جديد بانتظار الموافقة: "${draft.title.ar}"`,
    },
    currentValue: 'Yayımlanmamış taslak',
    proposedValue: `Slug: /blog/${draft.slug}\nBaşlık: ${draft.title.tr}`,
    expectedBenefit: suggestion.expectedBenefit,
    riskLevel: 'low',
    metadataPayload: {
      slug: draft.slug,
      draftId: draft.id,
      category: draft.category,
      title: draft.title,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      contentMarkdown: draft.contentMarkdown,
    },
  });

  draft.approvalId = approval.id;

  const existing = await getContentDrafts();
  await saveContentDrafts([draft, ...existing]);

  await appendSeoAuditLog({
    action: 'draft_created',
    actor: 'admin',
    target: `/blog/${draft.slug}`,
    summary: `Yeni içerik taslağı oluşturuldu ve onay kuyruğuna eklendi: "${draft.title.tr}"`,
    approvalId: approval.id,
  });

  return draft;
}
