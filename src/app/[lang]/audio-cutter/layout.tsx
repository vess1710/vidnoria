import type { Metadata } from 'next';
import { Locale } from '@/lib/i18n';
import { buildPageMetadata } from '@/lib/seo/metadata';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  return buildPageMetadata(lang as Locale, 'audio-cutter', '/audio-cutter');
}

export default function AudioCutterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
