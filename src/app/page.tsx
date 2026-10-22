'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { defaultLocale } from '@/lib/i18n';

/**
 * Root page redirects to the default locale (Turkish).
 * Works seamlessly on both Node.js servers and static exports (GitHub Pages).
 */
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/${defaultLocale}`);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <meta httpEquiv="refresh" content={`0;url=/${defaultLocale}/`} />
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-muted-foreground">Vidnoria yükleniyor...</p>
      </div>
    </div>
  );
}
