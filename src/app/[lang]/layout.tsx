import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, getDirection, getTranslations, createTranslator } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/context';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HtmlDirSync from '@/components/layout/HtmlDirSync';
import CookieConsent from '@/components/layout/CookieConsent';
import AdSlot from '@/components/ads/AdSlot';
import MobileStickyAd from '@/components/ads/MobileStickyAd';

interface LangLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

const SEO_KEYWORDS: Record<Locale, string[]> = {
  tr: [
    'video indir',
    'ücretsiz video indir',
    'youtube video indir',
    'youtube mp3 indir',
    'youtube mp3 dönüştürücü',
    'youtube mp4 indir',
    'instagram video indir',
    'instagram reels indir',
    'tiktok video indir',
    'tiktok filigransız video indir',
    'twitter video indir',
    'x video indir',
    'facebook video indir',
    'online video indirici',
    'müzik indir',
    'mp3 dönüştürücü',
    'hd video indir',
    '4k video indir',
    'programsız video indir',
    'vidnoria',
  ],
  en: [
    'video downloader',
    'free video downloader',
    'online video downloader',
    'youtube video downloader',
    'youtube to mp3',
    'youtube to mp4',
    'instagram video downloader',
    'instagram reels downloader',
    'tiktok video downloader',
    'tiktok downloader without watermark',
    'twitter video downloader',
    'facebook video downloader',
    'mp3 converter',
    'hd video download',
    '4k video downloader',
    'vidnoria',
  ],
  ar: [
    'تحميل فيديو',
    'تنزيل فيديو مجانا',
    'تحميل فيديو من يوتيوب',
    'تحويل يوتيوب الى mp3',
    'تحميل مقاطع انستقرام',
    'تحميل ريلز انستقرام',
    'تحميل فيديو تيك توك بدون علامة مائية',
    'تحميل فيديو تويتر',
    'تحميل فيديو فيسبوك',
    'تحميل mp4',
    'تحميل mp3',
    'فيدنوريا',
  ],
};

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = (locales.includes(lang as Locale) ? lang : 'tr') as Locale;
  const dict = await getTranslations(locale);
  const t = createTranslator(dict);

  return {
    title: {
      default: t('seo.homeTitle'),
      template: `%s | Vidnoria`,
    },
    description: t('seo.homeDescription'),
    keywords: SEO_KEYWORDS[locale] || SEO_KEYWORDS.tr,
    metadataBase: new URL('https://vidnoria.com'),
    verification: {
      google: 'PlAR_ihtFqyAIvHZPYltHb-Rueh_Dl6EqJ5b2eV0bZg',
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    alternates: {
      canonical: `https://vidnoria.com/${locale}`,
      languages: {
        'tr': 'https://vidnoria.com/tr',
        'en': 'https://vidnoria.com/en',
        'ar': 'https://vidnoria.com/ar',
        'x-default': 'https://vidnoria.com/tr',
      },
    },
    openGraph: {
      title: t('seo.homeTitle'),
      description: t('seo.homeDescription'),
      url: `https://vidnoria.com/${locale}`,
      siteName: 'Vidnoria',
      locale: locale === 'ar' ? 'ar_SA' : locale === 'tr' ? 'tr_TR' : 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('seo.homeTitle'),
      description: t('seo.homeDescription'),
    },
  };
}

export default async function LangLayout({ children, params }: LangLayoutProps) {
  const { lang } = await params;

  if (!locales.includes(lang as Locale)) {
    notFound();
  }

  const locale = lang as Locale;
  const dict = await getTranslations(locale);
  const t = createTranslator(dict);
  const dir = getDirection(locale);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Vidnoria',
    url: `https://vidnoria.com/${locale}`,
    description: t('seo.homeDescription'),
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    inLanguage: ['tr', 'en', 'ar'],
  };

  return (
    <I18nProvider lang={locale} dict={dict}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HtmlDirSync />
      <div dir={dir} className="flex flex-col min-h-screen">
        <Header />

        {/* Main wrapper with Left & Right Skyscraper Ad Rails on desktop */}
        <div className="flex-1 flex justify-center w-full max-w-[1680px] mx-auto px-2 sm:px-4">
          {/* Left Sticky Skyscraper Ad (160x600) */}
          <aside className="hidden xl:flex flex-col items-center pt-8 shrink-0 w-[170px]">
            <div className="sticky top-24">
              <AdSlot
                slotId="left-sidebar-ad"
                format="vertical"
                label="Sol Dikey Reklam (160×600)"
              />
            </div>
          </aside>

          {/* Center Page Content */}
          <main className="flex-1 min-w-0">
            {children}
          </main>

          {/* Right Sticky Skyscraper Ad (160x600) */}
          <aside className="hidden xl:flex flex-col items-center pt-8 shrink-0 w-[170px]">
            <div className="sticky top-24">
              <AdSlot
                slotId="right-sidebar-ad"
                format="vertical"
                label="Sağ Dikey Reklam (160×600)"
              />
            </div>
          </aside>
        </div>

        <Footer />
        <MobileStickyAd />
        <CookieConsent />
      </div>
    </I18nProvider>
  );
}
