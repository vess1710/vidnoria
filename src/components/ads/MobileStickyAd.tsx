'use client';

import { useState, useEffect } from 'react';
import { X, Sparkles } from 'lucide-react';
import { SiteSettings } from '@/types';

export default function MobileStickyAd() {
  const [closed, setClosed] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [publisherId, setPublisherId] = useState('');
  const [slotCode, setSlotCode] = useState('');

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem('vidnoria_settings');
        if (!raw) return;
        const settings = JSON.parse(raw) as SiteSettings;
        if (settings?.ads?.enabled === false) {
          setIsEnabled(false);
          return;
        }
        const slot = settings?.ads?.slots?.find((s) => s.id === 'mobile-sticky-ad');
        if (slot && slot.enabled === false) {
          setIsEnabled(false);
          return;
        }
        setIsEnabled(true);
        if (settings?.ads?.adsensePublisherId) {
          setPublisherId(settings.ads.adsensePublisherId.replace(/^ca-pub-|^pub-/, ''));
        }
        if (slot?.slotId) {
          setSlotCode(slot.slotId.trim());
        }
      } catch {
        // ignore
      }
    };

    sync();
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  if (closed || !isEnabled) return null;

  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 flex justify-center bg-card/95 backdrop-blur-md border-t border-border py-1.5 px-2 shadow-2xl">
      <div className="relative w-full max-w-[340px] flex items-center justify-center">
        <button
          onClick={() => setClosed(true)}
          aria-label="Reklamı Kapat"
          className="absolute -top-6 end-0 w-5 h-5 rounded-full bg-card border border-border text-muted-foreground hover:text-foreground flex items-center justify-center shadow-sm"
        >
          <X className="w-3 h-3" />
        </button>

        {publisherId && slotCode ? (
          <ins
            className="adsbygoogle block w-[320px] h-[50px]"
            style={{ display: 'inline-block', width: '320px', height: '50px' }}
            data-ad-client={`ca-pub-${publisherId}`}
            data-ad-slot={slotCode}
          />
        ) : (
          <div className="w-[320px] h-[50px] rounded-xl border border-dashed border-primary/30 bg-gradient-to-r from-primary/5 via-card to-secondary/5 flex items-center justify-between px-3 select-none">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-primary">
              <Sparkles className="w-3 h-3" />
              <span>Mobil Sabit Reklam</span>
            </span>
            <span className="text-[10px] text-muted-foreground">320 × 50 AdSense</span>
          </div>
        )}
      </div>
    </div>
  );
}
