import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { locales, getDirection, getTranslations, createTranslator } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/context';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import HtmlDirSync from '@/components/layout/HtmlDirSync';
import AdSlot from '@/components/ads/AdSlot';

interface LangLayoutProps {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}

export async function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = await getTranslations(locale);
  const t = createTranslator(dict);

  return {
    title: {
      default: t('seo.homeTitle'),
      template: `%s | Vidnoria`,
    },
    description: t('seo.homeDescription'),
    metadataBase: new URL('https://vidnoria.com'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'tr': '/tr',
        'en': '/en',
        'ar': '/ar',
      },
    },
    openGraph: {
      title: t('seo.homeTitle'),
      description: t('seo.homeDescription'),
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
  const dir = getDirection(locale);

  return (
    <I18nProvider lang={locale} dict={dict}>
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
      </div>
    </I18nProvider>
  );
}
