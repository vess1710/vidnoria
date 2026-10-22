'use client';

import React, { createContext, useContext, useMemo } from 'react';
import type { Locale } from './index';
import { createTranslator } from './index';

interface I18nContextType {
  lang: Locale;
  dict: Record<string, any>;
  t: (key: string, values?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({
  lang,
  dict,
  children,
}: {
  lang: Locale;
  dict: Record<string, any>;
  children: React.ReactNode;
}) {
  const t = useMemo(() => createTranslator(dict), [dict]);

  return (
    <I18nContext.Provider value={{ lang, dict, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
