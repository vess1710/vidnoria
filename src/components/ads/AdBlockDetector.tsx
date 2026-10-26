'use client';

import { useState, useEffect } from 'react';
import { HeartHandshake, X, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

export default function AdBlockDetector() {
  const { lang } = useI18n();
  const [isBlocked, setIsBlocked] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    // Check if dismissed recently (within 24 hours)
    try {
      const lastDismissed = localStorage.getItem('vidnoria_adblock_dismissed');
      if (lastDismissed && Date.now() - parseInt(lastDismissed, 10) < 24 * 60 * 60 * 1000) {
        return;
      }
    } catch {
      // ignore
    }

    // Probe for ad-blockers after 2 seconds
    const timer = setTimeout(() => {
      // Method 1: Check if Google AdSense script was blocked
      const isScriptLoaded = !!document.querySelector('script[src*="pagead2.googlesyndication.com"]');
      
      // Method 2: Bait element test
      const bait = document.createElement('div');
      bait.className = 'pub_300x250 pub_300x250m pub_728x90 text-ad textAd text_ad text_ads text-ads text-ad-links';
      bait.style.position = 'absolute';
      bait.style.top = '-9999px';
      bait.style.left = '-9999px';
      bait.style.width = '1px';
      bait.style.height = '1px';
      document.body.appendChild(bait);

      const isBaitBlocked =
        window.getComputedStyle(bait).display === 'none' ||
        window.getComputedStyle(bait).visibility === 'hidden' ||
        bait.offsetParent === null;

      document.body.removeChild(bait);

      if (isBaitBlocked) {
        setIsBlocked(true);
        setDismissed(false);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    try {
      localStorage.setItem('vidnoria_adblock_dismissed', Date.now().toString());
    } catch {
      // ignore
    }
    setDismissed(true);
  };

  if (!isBlocked || dismissed) return null;

  const content = {
    tr: {
      title: 'Vidnoria’yı Reklamsız da Seviyoruz, Ama...',
      text: 'Vidnoria tamamen ücretsiz, sınırsız ve programsızdır. Yüksek hızlı sunucu ve medya dönüştürme masraflarımızı karşılayabilmemiz için lütfen reklam engelleyicinizi sitemizde devre dışı bırakmayı değerlendirin.',
      btn: 'Anladım, Destek Olacağım',
    },
    en: {
      title: 'Support Free Tools on Vidnoria',
      text: 'Vidnoria is 100% free and software-free. To help us maintain fast video processing servers, please consider whitelisting Vidnoria in your ad blocker.',
      btn: 'Got it, I will support',
    },
    ar: {
      title: 'ادعم استمرار خدمات فيدنوريا المجانية',
      text: 'موقع فيدنوريا مجاني تماماً وبدون برامج. لمساعدتنا في تغطية تكاليف الخوادم السريعة، يرجى التكرم بتعطيل مانع الإعلانات.',
      btn: 'حسناً، سأقوم بالدعم',
    },
  }[lang] || {
    title: 'Support Vidnoria',
    text: 'Please consider disabling your ad blocker to keep our services free.',
    btn: 'Got it',
  };

  return (
    <div className="fixed bottom-4 start-4 end-4 md:start-auto md:end-6 md:max-w-md z-40 animate-slide-up">
      <div className="glass-card bg-background/95 border-amber-500/40 p-5 rounded-2xl shadow-2xl flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
          <HeartHandshake className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-sm text-foreground">{content.title}</h4>
            <button
              onClick={handleDismiss}
              className="text-muted-foreground hover:text-foreground p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            {content.text}
          </p>
          <button
            onClick={handleDismiss}
            className="w-full py-2 px-3 rounded-lg gradient-bg text-white font-medium text-xs flex items-center justify-center gap-1.5 shadow-sm hover:opacity-95 transition-opacity"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{content.btn}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
