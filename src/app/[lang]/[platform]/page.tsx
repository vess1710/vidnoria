import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Locale } from '@/lib/i18n';
import { readJSON, contentPath } from '@/lib/storage';
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
  // Localized aliases
  'youtube-video-indir',
  'instagram-video-indir',
  'tiktok-video-indir',
  'facebook-video-indir',
  'twitter-video-indir',
];

function normalizeSlug(slug: string): string {
  if (slug.endsWith('-video-indir')) {
    return slug.replace('-video-indir', '-video-downloader');
  }
  return slug;
}

export async function generateMetadata({ params }: PlatformPageProps): Promise<Metadata> {
  const { lang, platform } = await params;
  const normalized = normalizeSlug(platform);
  const seoData = await readJSON<any>(contentPath('seo', 'pages.json'));
  const page = seoData?.pages?.[normalized];

  if (!page) return {};

  const locale = lang as Locale;
  return {
    title: page.title?.[locale] || page.title?.['en'],
    description: page.description?.[locale] || page.description?.['en'],
    keywords: page.keywords?.[locale] || page.keywords?.['en'],
  };
}

export default async function PlatformSEOPage({ params }: PlatformPageProps) {
  const { lang, platform } = await params;
  const normalized = normalizeSlug(platform);

  if (!VALID_PLATFORMS.includes(platform)) {
    notFound();
  }

  const locale = lang as Locale;
  const isRtl = locale === 'ar';

  const seoData = await readJSON<any>(contentPath('seo', 'pages.json'));
  const page = seoData?.pages?.[normalized];

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
