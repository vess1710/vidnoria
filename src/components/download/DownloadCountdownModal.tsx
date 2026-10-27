'use client';

import { useState, useEffect } from 'react';
import { Download, Sparkles, X, CheckCircle2, Clock } from 'lucide-react';
import AdSlot from '@/components/ads/AdSlot';

interface DownloadCountdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  downloadUrl: string;
  formatLabel: string;
  lang?: string;
  initialSeconds?: number;
  fileName?: string;
  slotId?: string;
}

export default function DownloadCountdownModal({
  isOpen,
  onClose,
  downloadUrl,
  formatLabel,
  lang = 'tr',
  initialSeconds = 10,
  fileName,
  slotId = 'download-countdown-ad',
}: DownloadCountdownModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(initialSeconds);
      setIsReady(false);
      return;
    }

    setSecondsLeft(initialSeconds);
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
            if (fileName) {
              a.download = fileName;
            } else {
              a.setAttribute('download', '');
            }
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
  }, [isOpen, downloadUrl, fileName, initialSeconds]);

  if (!isOpen) return null;

  const t = {
    tr: {
      title: 'İndirme Hazırlanıyor...',
      subtitle: `${formatLabel} formatı için yüksek hızlı bağlantı ve medya işleme tamamlanıyor.`,
      seconds: 'saniye içinde indirme otomatik başlayacak...',
      ready: '🎉 İndirme Başlatıldı!',
      manual: 'İndirme başlamadıysa veya tekrar indirmek için tıklayın',
      sponsor: 'Sponsorlu Reklam Alanı',
      close: 'Kapat',
      secBadge: 'sn',
    },
    en: {
      title: 'Preparing Your Download...',
      subtitle: `Establishing high-speed pipeline and finalizing ${formatLabel}.`,
      seconds: 'seconds until download starts automatically...',
      ready: '🎉 Download Started!',
      manual: "Click here if download didn't start or to download again",
      sponsor: 'Sponsored Advertisement',
      close: 'Close',
      secBadge: 's',
    },
    ar: {
      title: 'جاري تجهيز التحميل...',
      subtitle: `جاري إنشاء اتصال عالي السرعة وتجهيز ${formatLabel}.`,
      seconds: 'ثوانٍ وسيبدأ التحميل تلقائياً...',
      ready: '🎉 بدأ التحميل الآن!',
      manual: 'اضغط هنا إذا لم يبدأ التحميل أو لإعادة التحميل',
      sponsor: 'محتوى إعلاني مدعوم',
      close: 'إغلاق',
      secBadge: 'ث',
    },
  }[lang] || {
    title: 'Preparing Download...',
    subtitle: `Finalizing ${formatLabel}.`,
    seconds: 'seconds until download starts automatically...',
    ready: '🎉 Ready!',
    manual: 'Click here to download',
    sponsor: 'Sponsored',
    close: 'Close',
    secBadge: 's',
  };

  const progressPercent = Math.min(
    100,
    Math.max(0, ((initialSeconds - secondsLeft) / initialSeconds) * 100)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg glass-card bg-background/95 border-primary/30 p-6 md:p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 end-4 p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-accent transition-colors"
          aria-label={t.close}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isReady ? t.ready : t.title}</span>
        </div>

        {/* Large Countdown Badge */}
        {!isReady ? (
          <div className="flex flex-col items-center mb-3">
            <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30 shadow-inner mb-2">
              <span className="font-mono font-black text-3xl text-primary animate-pulse">
                {secondsLeft}
              </span>
              <span className="absolute -bottom-1 text-[10px] font-bold text-muted-foreground uppercase">
                {t.secBadge}
              </span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              {secondsLeft} {t.seconds}
            </h3>
          </div>
        ) : (
          <div className="flex flex-col items-center mb-3">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-500 mb-2">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-500">
              {t.ready}
            </h3>
          </div>
        )}

        <p className="text-xs sm:text-sm text-muted-foreground mb-4 max-w-sm">
          {t.subtitle}
        </p>

        {/* Progress Bar */}
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden mb-5">
          <div
            className="h-full gradient-bg transition-all duration-1000 ease-linear shadow-sm"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* High-CTR Sponsored / AdSense Placement */}
        <div className="w-full my-2 p-2 rounded-xl border border-border/50 bg-card/40 min-h-[250px] flex flex-col items-center justify-center">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
            {t.sponsor}
          </span>
          <AdSlot
            slotId={slotId}
            format="rectangle"
            label="Geri Sayım İçi 300×250 Odaklı Reklam"
          />
        </div>

        {/* Action Button */}
        <div className="mt-4 w-full">
          {isReady ? (
            <a
              href={downloadUrl}
              download={fileName || ''}
              className="w-full gradient-bg text-white font-bold py-3.5 px-6 rounded-xl inline-flex items-center justify-center gap-2 shadow-lg hover:opacity-90 transition-all text-sm sm:text-base"
            >
              <Download className="w-5 h-5" />
              <span>{t.manual}</span>
            </a>
          ) : (
            <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>{secondsLeft} {t.seconds}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
