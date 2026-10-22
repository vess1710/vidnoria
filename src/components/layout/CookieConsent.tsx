'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Cookie, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

export default function CookieConsent() {
  const { lang } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const accepted = localStorage.getItem('vidnoria_cookie_consent');
      if (!accepted) {
        setVisible(true);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAccept = () => {
    try {
      localStorage.setItem('vidnoria_cookie_consent', 'accepted');
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  const texts = {
    tr: {
      message: 'Size en iyi deneyimi sunmak ve Google AdSense / Analytics hizmetlerini iyileştirmek için çerezleri kullanıyoruz.',
      policy: 'Çerez Politikası',
      accept: 'Kabul Et',
    },
    en: {
      message: 'We use cookies to provide the best experience and improve Google AdSense / Analytics services.',
      policy: 'Cookie Policy',
      accept: 'Accept All',
    },
    ar: {
      message: 'نحن نستخدم ملفات تعريف الارتباط لتقديم أفضل تجربة وتحسين خدمات إعلانات وتحليلات جوجل.',
      policy: 'سياسة ملفات تعريف الارتباط',
      accept: 'قبول الكل',
    },
  }[lang] || {
    message: 'We use cookies to provide the best experience.',
    policy: 'Cookie Policy',
    accept: 'Accept',
  };

  return (
    <div className="fixed bottom-4 inset-x-4 z-50 max-w-3xl mx-auto animate-slide-up">
      <div className="glass-card p-4 sm:px-6 border border-primary/30 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 bg-card/95 backdrop-blur-xl">
        <div className="flex items-center gap-3 text-xs sm:text-sm text-muted-foreground">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Cookie className="w-5 h-5" />
          </div>
          <p className="leading-relaxed">
            {texts.message}{' '}
            <Link href={`/${lang}/cookies`} className="text-primary font-semibold hover:underline">
              {texts.policy}
            </Link>
          </p>
        </div>

        <button
          onClick={handleAccept}
          className="gradient-bg text-white text-xs sm:text-sm font-semibold px-5 py-2.5 rounded-xl flex items-center gap-1.5 shrink-0 shadow-md hover:opacity-95 transition-all w-full sm:w-auto justify-center"
        >
          <Check className="w-4 h-4" />
          <span>{texts.accept}</span>
        </button>
      </div>
    </div>
  );
}
