import LegalPageRenderer from '@/components/layout/LegalPageRenderer';
import { Locale } from '@/lib/i18n';

export default async function CookiesPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <LegalPageRenderer pageKey="cookies" lang={lang as Locale} />;
}
