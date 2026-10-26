import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Locale, locales } from '@/lib/i18n';
import { readJSON, contentPath } from '@/lib/storage';
import { buildPageMetadata, SeoPagesFile } from '@/lib/seo/metadata';
import HeroSection from '@/components/home/HeroSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import FeaturesSection from '@/components/home/FeaturesSection';
import FAQSection from '@/components/home/FAQSection';
import AdSlot from '@/components/ads/AdSlot';

interface PlatformPageProps {
  params: Promise<{ lang: string; platform: string }>;
}

const VALID_PLATFORMS = [
  'youtube-video-downloader',
  'instagram-video-downloader',
  'tiktok-video-downloader',
  'facebook-video-downloader',
  'twitter-video-downloader',
  'pinterest-video-downloader',
  'reddit-video-downloader',
  'threads-video-downloader',
  'capcut-video-downloader',
  'snapchat-video-downloader',
  // Localized aliases & high-volume SEO landing pages
  'youtube-video-indir',
  'youtube-mp3-indir',
  'youtube-shorts-indir',
  'instagram-video-indir',
  'instagram-reels-indir',
  'tiktok-video-indir',
  'facebook-video-indir',
  'twitter-video-indir',
  'pinterest-video-indir',
  'reddit-video-indir',
  'threads-video-indir',
  'capcut-video-indir',
  'snapchat-video-indir',
];

export async function generateStaticParams() {
  return locales.flatMap((lang) =>
    VALID_PLATFORMS.map((platform) => ({ lang, platform }))
  );
}

function normalizeSlug(slug: string): string {
  if (slug === 'youtube-mp3-indir' || slug === 'youtube-shorts-indir') {
    return 'youtube-video-downloader';
  }
  if (slug === 'instagram-reels-indir') {
    return 'instagram-video-downloader';
  }
  if (slug.endsWith('-video-indir')) {
    return slug.replace('-video-indir', '-video-downloader');
  }
  return slug;
}

export async function generateMetadata({ params }: PlatformPageProps): Promise<Metadata> {
  const { lang, platform } = await params;
  const normalized = normalizeSlug(platform);
  const seoData = await readJSON<SeoPagesFile>(contentPath('seo', 'pages.json'));
  const key = seoData?.pages?.[platform] ? platform : normalized;

  return buildPageMetadata(lang as Locale, key, `/${platform}`);
}

export default async function PlatformSEOPage({ params }: PlatformPageProps) {
  const { lang, platform } = await params;
  const normalized = normalizeSlug(platform);

  if (!VALID_PLATFORMS.includes(platform)) {
    notFound();
  }

  const locale = lang as Locale;
  const isRtl = locale === 'ar';

  const seoData = await readJSON<SeoPagesFile>(contentPath('seo', 'pages.json'));
  const page = seoData?.pages?.[platform] || seoData?.pages?.[normalized];

  const title = page?.title?.[locale] || page?.title?.['en'] || platform;
  const description = page?.description?.[locale] || page?.description?.['en'] || '';

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Platform Hero Banner */}
      <div className="py-12 text-center container-custom">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 gradient-text">
          {title}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {/* Input box */}
      <HeroSection />

      <div className="container-custom my-8">
        <AdSlot slotId="platform-mid-ad" format="horizontal" />
      </div>

      {/* Steps */}
      <HowItWorksSection />

      {/* Features */}
      <FeaturesSection />

      {/* FAQ */}
      <FAQSection />
    </div>
  );
}
