import type { Metadata } from 'next';
import { Locale, getTranslations, createTranslator } from '@/lib/i18n';
import { buildPageMetadata } from '@/lib/seo/metadata';
import FAQSection from '@/components/home/FAQSection';
import AdSlot from '@/components/ads/AdSlot';

interface FaqPageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: FaqPageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = await getTranslations(locale);
  const t = createTranslator(dict);

  return buildPageMetadata(locale, 'faq', '/faq', {
    title: t('seo.faqTitle'),
    description: t('seo.faqDescription'),
  });
}

export default async function FaqPage() {
  return (
    <div className="py-12 md:py-20">
      <div className="container-custom mb-8">
        <AdSlot slotId="faq-top-ad" format="horizontal" />
      </div>

      <FAQSection />

      <div className="container-custom mt-8">
        <AdSlot slotId="faq-bottom-ad" format="auto" />
      </div>
    </div>
  );
}
