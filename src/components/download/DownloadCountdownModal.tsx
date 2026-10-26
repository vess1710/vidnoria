'use client';

import { useState, useEffect } from 'react';
import { Download, Sparkles, X, CheckCircle2, ArrowRight } from 'lucide-react';
import AdSlot from '@/components/ads/AdSlot';

interface DownloadCountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloadUrl: string;
  formatLabel: string;
  lang?: string;
}

export default function DownloadCountdownModal({
  isOpen,
  onClose,
  downloadUrl,
  formatLabel,
  lang = 'tr',
}: DownloadCountdownModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(3);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(3);
      setIsReady(false);
      return;
    }

    setSecondsLeft(3);
    setIsReady(false);

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsReady(true);
          // Trigger download automatically
          if (downloadUrl) {
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.setAttribute('download', '');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, downloadUrl]);

  if (!isOpen) return null;

  const t = {
    tr: {
      title: 'İndirme Hazırlanıyor...',
      subtitle: `${formatLabel} formatı için yüksek hızlı sunucu bağlantısı kuruluyor.`,
      seconds: 'saniye içinde indirme başlayacak...',
      ready: 'İndirme Başlatıldı!',
      manual: 'İndirme başlamadıysa buraya tıklayın',
      sponsor: 'Destekçimiz',
      close: 'Kapat',
    },
    en: {
      title: 'Preparing Your Download...',
      subtitle: `Establishing high-speed stream for ${formatLabel}.`,
      seconds: 'seconds until download starts...',
      ready: 'Download Started!',
      manual: "Click here if download didn't start automatically",
      sponsor: 'Sponsored',
      close: 'Close',
    },
    ar: {
      title: 'جاري تجهيز التحميل...',
      subtitle: `جاري إنشاء اتصال عالي السرعة للتنسيق ${formatLabel}.`,
      seconds: 'ثوانٍ حتى يبدأ التحميل...',
      ready: 'بدأ التحميل الآن!',
      manual: 'اضغط هنا إذا لم يبدأ التحميل تلقائياً',
      sponsor: 'إعلان مدعوم',
      close: 'إغلاق',
    },
  }[lang] || {
    title: 'Preparing Download...',
    subtitle: `Preparing ${formatLabel}.`,
    seconds: 'seconds remaining...',
    ready: 'Ready!',
    manual: 'Click here to download',
    sponsor: 'Sponsored',
    close: 'Close',
  };

  const progressPercent = ((3 - secondsLeft) / 3) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg glass-card bg-background/95 border-primary/30 p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
          aria-label={t.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isReady ? t.ready : t.title}</span>
        </div>

        <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">
          {isReady ? t.ready : `${secondsLeft} ${t.seconds}`}
        </h3>

        <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm">
          {t.subtitle}
        </p>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mb-6">
          <div
            className="h-full gradient-bg transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* High-CTR Sponsored / AdSense Placement */}
        <div className="w-full my-2 p-2 rounded-xl border border-border/50 bg-card/40 min-h-[250px] flex flex-col items-center justify-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            {t.sponsor}
          </span>
          <AdSlot
            slotId="download-countdown-ad"
            format="rectangle"
            label="Geri Sayım İçi 300×250 Odaklı Reklam"
          />
        </div>

        {/* Action Button */}
        <div className="mt-4 w-full">
          {isReady ? (
            <a
              href={downloadUrl}
              className="w-full gradient-bg text-white font-bold py-3.5 px-6 rounded-xl inline-flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all text-sm sm:text-base"
              download
            >
              <Download className="w-5 h-5" />
              <span>{t.manual}</span>
            </a>
          ) : (
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
              <span>{t.seconds}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
