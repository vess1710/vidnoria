'use client';

import { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const { lang } = useI18n();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if dismissed previously
    try {
      const dismissed = localStorage.getItem('vidnoria_pwa_dismissed');
      if (dismissed && Date.now() - parseInt(dismissed, 10) < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    } catch {
      // ignore
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem('vidnoria_pwa_dismissed', Date.now().toString());
    } catch {
      // ignore
    }
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  const content = {
    tr: {
      title: 'Vidnoria’yı Ana Ekrana Ekleyin',
      text: 'Tek tıkla, reklamsız ve hızlı video indirmek için Vidnoria uygulamasını cihazınıza yükleyin.',
      install: 'Uygulamayı Yükle',
      later: 'Daha Sonra',
    },
    en: {
      title: 'Install Vidnoria App',
      text: 'Install Vidnoria to your home screen for instant, 1-tap fast video downloads.',
      install: 'Install App',
      later: 'Later',
    },
    ar: {
      title: 'تثبيت تطبيق فيدنوريا',
      text: 'أضف فيدنوريا إلى الشاشة الرئيسية لهاتفك لتحميل الفيديوهات بضغطة زر واحدة وبسرعة فائقة.',
      install: 'تثبيت الآن',
      later: 'لاحقاً',
    },
  }[lang] || {
    title: 'Install Vidnoria',
    text: 'Install Vidnoria to your home screen for quick access.',
    install: 'Install',
    later: 'Later',
  };

  return (
    <div className="fixed top-20 start-4 end-4 md:start-auto md:end-6 md:max-w-sm z-40 animate-slide-down">
      <div className="glass-card bg-background/95 border-primary/40 p-4 rounded-2xl shadow-xl flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h5 className="font-bold text-xs sm:text-sm text-foreground">{content.title}</h5>
          <p className="text-[11px] text-muted-foreground line-clamp-1">{content.text}</p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleInstall}
              className="py-1 px-3 rounded-lg gradient-bg text-white font-medium text-xs flex items-center gap-1 shadow-sm"
            >
              <Download className="w-3 h-3" />
              <span>{content.install}</span>
            </button>
            <button
              onClick={handleDismiss}
              className="py-1 px-2.5 rounded-lg text-muted-foreground hover:text-foreground text-xs"
            >
              {content.later}
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-1 self-start"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
