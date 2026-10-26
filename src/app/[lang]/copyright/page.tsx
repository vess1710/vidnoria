import type { Metadata } from 'next';
import LegalPageRenderer from '@/components/layout/LegalPageRenderer';
import { Locale } from '@/lib/i18n';
import { buildPageMetadata } from '@/lib/seo/metadata';

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  return buildPageMetadata(lang as Locale, 'copyright', '/copyright');
}

export default async function CopyrightPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  return <LegalPageRenderer pageKey="copyright" lang={lang as Locale} />;
}
