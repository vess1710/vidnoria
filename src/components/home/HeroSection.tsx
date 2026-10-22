'use client';

import { useState, useRef } from 'react';
import { Search, Clipboard, Loader2, AlertCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { analyzeUrlClient } from '@/lib/client-api';

export default function HeroSection() {
  const { lang, t } = useI18n();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRtl = lang === 'ar';

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      setError('');
    } catch {
      inputRef.current?.focus();
    }
  };

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError(t('hero.emptyUrl'));
      return;
    }

    try {
      new URL(url);
    } catch {
      setError(t('hero.invalidUrl'));
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await analyzeUrlClient(url.trim());

      if (data.success && data.data) {
        const params = new URLSearchParams({
          url: url.trim(),
          id: data.data.id,
        });
        window.location.href = `/${lang}/download?${params.toString()}`;
      } else {
        const errorKey = data.error?.code
          ? `errors.${camelCase(data.error.code)}`
          : 'errors.generic';
        setError(t(errorKey) || data.error?.message || t('errors.generic'));
      }
    } catch {
      setError(t('errors.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleAnalyze();
    }
  };

  return (
    <section
      className="relative py-16 md:py-24 overflow-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div
        className="absolute inset-0 hero-pattern"
        style={{ background: 'var(--hero-bg)' }}
      />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 start-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 end-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="container-custom relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6 animate-fade-in">
            <span className="gradient-text">{t('hero.title')}</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed animate-fade-in" style={{ animationDelay: '0.1s' }}>
            {t('hero.subtitle')}
          </p>

          <div className="max-w-2xl mx-auto animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className={`glass-card p-2 flex flex-col sm:flex-row gap-2 ${error ? 'ring-2 ring-destructive/50' : ''}`}>
              <div className="flex-1 flex items-center gap-2 bg-background/50 rounded-xl px-4">
                <Search className="w-5 h-5 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError('');
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder={t('hero.placeholder')}
                  className="w-full py-3.5 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none text-sm sm:text-base"
                  disabled={loading}
                  dir="ltr"
                />
                <button
                  onClick={handlePaste}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-primary rounded-lg hover:bg-accent transition-colors"
                  title={t('hero.pasteButton')}
                >
                  <Clipboard className="w-4 h-4" />
                  <span className="hidden sm:inline">{t('hero.pasteButton')}</span>
                </button>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={loading}
                className="gradient-bg text-white font-semibold px-8 py-3.5 rounded-xl hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shrink-0 min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('hero.analyzing')}</span>
                  </>
                ) : (
                  t('hero.analyzeButton')
                )}
              </button>
            </div>

            {error && (
              <div className="flex items-center gap-2 mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm animate-slide-up">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function camelCase(str: string): string {
  return str.toLowerCase().replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
