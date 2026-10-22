import LegalPageRenderer from '@/components/layout/LegalPageRenderer';
import { Locale } from '@/lib/i18n';

export default async function PrivacyPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <LegalPageRenderer pageKey="privacy" lang={lang as Locale} />;
}
