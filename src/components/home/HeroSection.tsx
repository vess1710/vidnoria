'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Search, Clipboard, Loader2, AlertCircle, History, Trash2, Film, Image as ImageIcon, Share2, Scissors, Sparkles } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';
import { analyzeUrlClient } from '@/lib/client-api';

interface RecentItem {
  id: string;
  title: string;
  thumbnail: string;
  platform: string;
  url: string;
}

export default function HeroSection() {
  const { lang, t } = useI18n();
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const isRtl = lang === 'ar';

  useEffect(() => {
    try {
      const raw = localStorage.getItem('vidnoria_recent_history');
      if (raw) {
        setRecentItems(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, []);

  const clearHistory = () => {
    try {
      localStorage.removeItem('vidnoria_recent_history');
    } catch {
      // ignore
    }
    setRecentItems([]);
  };

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

  const toolTexts = {
    tr: {
      videoConv: 'Video → Ses / Format Dönüştürücü',
      imageConv: 'Resim Uzantı Dönüştürücü (JPG/PNG/WebP)',
      recentTitle: 'Son İncelenen / İndirilen Videolar',
      clear: 'Geçmişi Temizle',
      share: 'WhatsApp ile Paylaş',
    },
    en: {
      videoConv: 'Video → Audio / Format Converter',
      imageConv: 'Image Format Converter (JPG/PNG/WebP)',
      recentTitle: 'Recently Analyzed / Downloaded',
      clear: 'Clear History',
      share: 'Share on WhatsApp',
    },
    ar: {
      videoConv: 'محول الفيديو والصوت',
      imageConv: 'محول صيغ الصور (JPG/PNG/WebP)',
      recentTitle: 'الفيديوهات الأخيرة',
      clear: 'مسح السجل',
      share: 'مشاركة عبر واتساب',
    },
  }[lang] || {
    videoConv: 'Video Converter',
    imageConv: 'Image Converter',
    recentTitle: 'Recent Videos',
    clear: 'Clear',
    share: 'Share',
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
            {/* Mode Switcher: Link Downloader vs Drag & Drop Media Studio */}
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="inline-flex items-center p-1 bg-muted/60 backdrop-blur rounded-2xl border border-border shadow-inner">
                <span className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-white shadow-sm flex items-center gap-1.5 cursor-default">
                  <Search className="w-3.5 h-3.5" />
                  {lang === 'tr' ? 'Link ile İndir' : lang === 'ar' ? 'تحميل عبر الرابط' : 'Paste Link Downloader'}
                </span>
                <Link
                  href={`/${lang}/studio`}
                  className="px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-card/60 transition-all flex items-center gap-1.5 group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
                  <span>{lang === 'tr' ? 'Medya Stüdyosu' : lang === 'ar' ? 'استوديو الوسائط' : 'Media Studio'}</span>
                  <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-md tracking-wider">YENİ</span>
                </Link>
              </div>
            </div>

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

            {/* Quick Tool Pills: Studio, Video Converter & Image Converter */}
            <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
              <Link
                href={`/${lang}/studio`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500/15 via-rose-500/15 to-purple-500/15 text-foreground border border-amber-500/30 hover:border-amber-500 hover:shadow-md transition-all shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{lang === 'tr' ? 'Medya Stüdyosu ✨ (Video & Fotoğraf Düzenle)' : lang === 'ar' ? 'استوديو الوسائط ✨' : 'Media Studio ✨ (Edit Video & Photo)'}</span>
              </Link>
              <Link
                href={`/${lang}/video-converter`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                <Film className="w-3.5 h-3.5" />
                <span>{toolTexts.videoConv}</span>
              </Link>
              <Link
                href={`/${lang}/image-converter`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary hover:text-white transition-all shadow-sm"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{toolTexts.imageConv}</span>
              </Link>
              <Link
                href={`/${lang}/audio-cutter`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all shadow-sm"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'MP3 / Ses Kesici' : lang === 'ar' ? 'قص الصوت MP3' : 'MP3 / Audio Cutter'}</span>
              </Link>
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent('Ücretsiz Video, MP3 ve Format Dönüştürücü: https://vidnoria.com')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white transition-all"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>{toolTexts.share}</span>
              </a>
            </div>

            {/* Recent Downloads History (Browser localStorage) */}
            {recentItems.length > 0 && (
              <div className="mt-8 text-start glass-card p-4 sm:p-5 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <History className="w-3.5 h-3.5 text-primary" />
                    <span>{toolTexts.recentTitle}</span>
                  </div>
                  <button
                    onClick={clearHistory}
                    className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>{toolTexts.clear}</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {recentItems.slice(0, 4).map((item) => (
                    <Link
                      key={item.url}
                      href={`/${lang}/download?url=${encodeURIComponent(item.url)}&id=${encodeURIComponent(item.id)}`}
                      className="flex items-center gap-3 p-2 rounded-xl border border-border bg-card/50 hover:bg-accent/50 transition-all group"
                    >
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.title}
                          className="w-14 h-10 object-cover rounded-lg shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-10 rounded-lg bg-primary/10 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-muted-foreground uppercase">
                          {item.platform}
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
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
