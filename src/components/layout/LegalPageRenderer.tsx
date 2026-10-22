import { notFound } from 'next/navigation';
import { readJSON, contentPath } from '@/lib/storage';
import { Locale } from '@/lib/i18n';
import AdSlot from '@/components/ads/AdSlot';

interface LegalRendererProps {
  pageKey: 'privacy' | 'terms' | 'copyright' | 'disclaimer' | 'cookies';
  lang: Locale;
}

export default async function LegalPageRenderer({ pageKey, lang }: LegalRendererProps) {
  const legalData = await readJSON<any>(contentPath('settings', 'legal.json'));
  const page = legalData?.pages?.[pageKey];

  if (!page) {
    notFound();
  }

  const title = page.title?.[lang] || page.title?.['en'] || pageKey;
  const isRtl = lang === 'ar';

  return (
    <div className="container-custom py-12 md:py-20 max-w-4xl" dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="mb-10 text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 gradient-text">
          {title}
        </h1>
        {page.lastUpdated && (
          <p className="text-xs text-muted-foreground">
            {lang === 'tr' ? 'Son Güncelleme' : lang === 'en' ? 'Last Updated' : 'آخر تحديث'}: {page.lastUpdated}
          </p>
        )}
      </header>

      <div className="mb-8">
        <AdSlot slotId={`legal-${pageKey}-top-ad`} format="horizontal" />
      </div>

      <div className="glass-card p-6 md:p-10 space-y-8 leading-relaxed">
        {page.sections?.map((sec: any) => {
          const secTitle = sec.title?.[lang] || sec.title?.['en'];
          const secContent = sec.content?.[lang] || sec.content?.['en'];

          return (
            <section key={sec.id} className="space-y-3">
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                {secTitle}
              </h2>
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {secContent}
              </p>
            </section>
          );
        })}
      </div>

      <div className="mt-8">
        <AdSlot slotId={`legal-${pageKey}-bottom-ad`} format="auto" />
      </div>
    </div>
  );
}
