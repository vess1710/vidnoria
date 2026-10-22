'use client';

import { useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { getDirection } from '@/lib/i18n';

/**
 * Synchronizes the <html> element's `lang` and `dir` attributes with the active locale.
 * Eliminates layout shifts and scrollbar jumping during language transitions.
 */
export default function HtmlDirSync() {
  const { lang } = useI18n();

  useEffect(() => {
    const dir = getDirection(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang]);

  return null;
}
