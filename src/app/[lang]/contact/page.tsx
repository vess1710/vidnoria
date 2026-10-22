import type { Metadata } from 'next';
import { Mail } from 'lucide-react';
import { Locale, getTranslations, createTranslator } from '@/lib/i18n';
import ContactForm from '@/components/contact/ContactForm';

interface ContactPageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = await getTranslations(locale);
  const t = createTranslator(dict);

  return {
    title: t('legal.contact'),
    description: 'Get in touch with the Vidnoria support and DMCA compliance team.',
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = await getTranslations(locale);
  const t = createTranslator(dict);
  const isRtl = locale === 'ar';

  return (
    <div className="container-custom py-12 md:py-20 max-w-4xl" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 gradient-text">
          {t('legal.contact')}
        </h1>
        <p className="text-muted-foreground text-base md:text-lg">
          {locale === 'tr' && 'Sorularınız, telif hakkı bildirimleriniz (DMCA) veya teknik destek için bize ulaşın.'}
          {locale === 'en' && 'Contact us for general inquiries, DMCA takedown notices, or technical support.'}
          {locale === 'ar' && 'تواصل معنا للاستفسارات العامة أو إشعارات حقوق النشر أو الدعم الفني.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
        {/* Info card */}
        <div className="glass-card p-6 md:p-8 space-y-6">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <span>Vidnoria Support</span>
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {locale === 'tr' && 'Vidnoria ekibi telif haklarına ve yasal mevzuata azami özen göstermektedir. DMCA veya içerik kaldırma talepleriniz en geç 24 saat içerisinde değerlendirilir.'}
            {locale === 'en' && 'The Vidnoria team pays utmost respect to digital copyright laws. All legitimate DMCA requests are processed within 24 hours.'}
            {locale === 'ar' && 'فريق فيدنوريا يلتزم تماماً بحماية حقوق النشر الرقمية. يتم الرد على جميع طلبات الحذف القانونية خلال 24 ساعة.'}
          </p>

          <div className="space-y-3 pt-4 border-t border-border">
            <div className="text-sm">
              <span className="text-muted-foreground">E-Mail: </span>
              <a href="mailto:contact@vidnoria.com" className="font-semibold text-primary hover:underline">
                contact@vidnoria.com
              </a>
            </div>
            <div className="text-sm">
              <span className="text-muted-foreground">DMCA: </span>
              <a href="mailto:dmca@vidnoria.com" className="font-semibold text-primary hover:underline">
                dmca@vidnoria.com
              </a>
            </div>
          </div>
        </div>

        {/* Client-side form */}
        <ContactForm locale={locale} />
      </div>
    </div>
  );
}
