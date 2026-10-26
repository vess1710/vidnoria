import type { Metadata } from 'next';
import { getTranslations } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/context';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HeroSection from '@/components/home/HeroSection';
import PlatformsSection from '@/components/home/PlatformsSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import FeaturesSection from '@/components/home/FeaturesSection';
import SEOContentSection from '@/components/home/SEOContentSection';
import FAQSection from '@/components/home/FAQSection';
import AdSlot from '@/components/ads/AdSlot';
import MobileStickyAd from '@/components/ads/MobileStickyAd';
import AdBlockDetector from '@/components/ads/AdBlockDetector';
import PWAInstallPrompt from '@/components/layout/PWAInstallPrompt';
import CookieConsent from '@/components/layout/CookieConsent';

export const metadata: Metadata = {
  title: 'Vidnoria - Ücretsiz Online Video ve Müzik İndirici (MP4 & MP3)',
  description:
    'Vidnoria ile YouTube, Instagram, TikTok ve Twitter videolarını yüksek kalitede, ücretsiz ve programsız MP4 ile MP3 formatında anında indirin ve dönüştürün.',
  keywords: [
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
    'facebook video indir',
    'online video indirici',
    'müzik indir',
    'mp3 dönüştürücü',
    'hd video indir',
    '4k video indir',
    'vidnoria',
  ],
  alternates: {
    canonical: 'https://vidnoria.com/tr',
    languages: {
      tr: 'https://vidnoria.com/tr',
      en: 'https://vidnoria.com/en',
      ar: 'https://vidnoria.com/ar',
      'x-default': 'https://vidnoria.com/tr',
    },
  },
  openGraph: {
    title: 'Vidnoria - Ücretsiz Online Video ve Müzik İndirici (MP4 & MP3)',
    description:
      'Vidnoria ile YouTube, Instagram, TikTok, Facebook ve Twitter videolarını yüksek kalitede, ücretsiz ve programsız MP4 ve MP3 formatında anında indirin.',
    url: 'https://vidnoria.com',
    siteName: 'Vidnoria',
    locale: 'tr_TR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vidnoria - Ücretsiz Online Video ve Müzik İndirici',
    description:
      'YouTube, Instagram, TikTok, Facebook ve Twitter videolarını programsız, ücretsiz ve yüksek kalitede indirin.',
  },
};

const faqJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Vidnoria ile video indirmek ücretsiz mi?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Evet, Vidnoria tamamen ücretsizdir. Herhangi bir üyelik, kayıt veya abonelik gerekmeden sınırsız sayıda video ve müzik indirebilirsiniz.',
      },
    },
    {
      '@type': 'Question',
      name: 'Hangi platformlardan video indirebilirim?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'YouTube, Instagram (Reels ve gönderiler), TikTok (filigransız), Facebook ve Twitter (X) gibi popüler tüm sosyal medya platformlarını desteklemekteyiz.',
      },
    },
    {
      '@type': 'Question',
      name: 'Videoları MP3 ses formatına dönüştürebilir miyim?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Evet, desteklenen tüm videolardaki sesi tek tıkla 320 kbps yüksek kaliteli MP3 formatında cihazınıza kaydedebilirsiniz.',
      },
    },
    {
      '@type': 'Question',
      name: 'Telefona (iOS / Android) video indirilebilir mi?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Evet, Vidnoria hem iPhone (Safari) hem de Android cihazlarla tam uyumludur. Ek uygulama kurmadan doğrudan tarayıcı üzerinden çalışır.',
      },
    },
    {
      '@type': 'Question',
      name: 'TikTok videoları filigransız indirilebilir mi?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Evet, Vidnoria TikTok videolarını orijinal kalitesinde ve filigran (watermark) olmadan indirmenize olanak tanır.',
      },
    },
  ],
};

export default async function RootPage() {
  const dict = await getTranslations('tr');

  return (
    <I18nProvider lang="tr" dict={dict}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <div dir="ltr" className="flex flex-col min-h-screen">
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
            <HeroSection />

            {/* Top Banner Ad under Hero */}
            <div className="container-custom py-4">
              <AdSlot
                slotId="home-top-banner"
                format="horizontal"
                label="Ana Sayfa Üst Banner Reklam (728×90)"
              />
            </div>

            <PlatformsSection />
            <HowItWorksSection />

            {/* Middle Banner Ad */}
            <div className="container-custom py-4">
              <AdSlot
                slotId="home-mid-banner"
                format="horizontal"
                label="İçerik Arası Banner Reklam (728×90)"
              />
            </div>

            <FeaturesSection />
            <SEOContentSection />
            <FAQSection />
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
        <AdBlockDetector />
        <PWAInstallPrompt />
        <CookieConsent />
      </div>
    </I18nProvider>
  );
}
