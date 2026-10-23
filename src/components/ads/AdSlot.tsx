'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SiteSettings } from '@/types';
import { getSiteSettingsClient } from '@/lib/client-api';

interface AdSlotProps {
  slotId: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
  publisherId?: string;
  label?: string;
}

/**
 * Google AdSense & Visual Ad Slot Component.
 * Reads live settings from Admin Panel (localStorage & API) so enabling/disabling
 * ads or entering AdSense Publisher ID + Reklam Birimi Kodu (Slot ID) takes effect immediately.
 */
export default function AdSlot({
  slotId,
  format = 'auto',
  className = '',
  publisherId: propPublisherId,
  label,
}: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null);
  const [isEnabled, setIsEnabled] = useState(true);
  const [livePublisherId, setLivePublisherId] = useState(propPublisherId || '');
  const [liveAdSenseUnitId, setLiveAdSenseUnitId] = useState('');

  useEffect(() => {
    const applySettings = (settings: SiteSettings | null) => {
      if (!settings?.ads) return;
      if (settings.ads.enabled === false) {
        setIsEnabled(false);
        return;
      }
      const matchedSlot = settings.ads.slots?.find((s) => s.id === slotId);
      if (matchedSlot && matchedSlot.enabled === false) {
        setIsEnabled(false);
        return;
      }
      setIsEnabled(true);
      if (settings.ads.adsensePublisherId) {
        setLivePublisherId(settings.ads.adsensePublisherId.replace(/^ca-pub-|^pub-/, ''));
      }
      if (matchedSlot?.slotId) {
        setLiveAdSenseUnitId(matchedSlot.slotId.trim());
      }
    };

    let cancelled = false;
    const load = () => {
      getSiteSettingsClient().then((s) => {
        if (!cancelled) applySettings(s);
      });
    };

    load();
    window.addEventListener('storage', load);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', load);
    };
  }, [slotId]);

  useEffect(() => {
    if (!isEnabled || !livePublisherId || !liveAdSenseUnitId) return;

    try {
      // Ensure AdSense script is loaded on page
      const scriptId = 'adsense-lib-script';
      if (!document.getElementById(scriptId)) {
        const s = document.createElement('script');
        s.id = scriptId;
        s.async = true;
        s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-${livePublisherId}`;
        s.crossOrigin = 'anonymous';
        document.head.appendChild(s);
      }

      const win = window as unknown as { adsbygoogle?: unknown[] };
      win.adsbygoogle = win.adsbygoogle || [];
      win.adsbygoogle.push({});
    } catch {
      // ignore
    }
  }, [isEnabled, livePublisherId, liveAdSenseUnitId]);

  if (!isEnabled) {
    return null;
  }

  const dimensionsMap: Record<string, { size: string; text: string }> = {
    horizontal: {
      size: 'w-full max-w-[728px] h-[90px]',
      text: '728 × 90 Leaderboard Reklam Alanı',
    },
    rectangle: {
      size: 'w-full max-w-[336px] h-[280px]',
      text: '336 × 280 Kutu Reklam Alanı',
    },
    vertical: {
      size: 'w-[160px] h-[600px]',
      text: '160 × 600 Dikey Yan Reklam',
    },
    auto: {
      size: 'w-full max-w-[728px] h-[100px]',
      text: 'Esnek (Responsive) Reklam Alanı',
    },
  };

  const currentDim = dimensionsMap[format] || dimensionsMap.auto;

  // If live AdSense Publisher ID + Ad Unit ID (Slot ID) are configured, render the real Google AdSense unit
  if (livePublisherId && liveAdSenseUnitId) {
    return (
      <div className={`flex justify-center my-2 ${className}`}>
        <ins
          ref={adRef}
          className={`adsbygoogle block ${currentDim.size}`}
          style={{ display: 'block' }}
          data-ad-client={`ca-pub-${livePublisherId}`}
          data-ad-slot={liveAdSenseUnitId}
          data-ad-format={format === 'auto' ? 'auto' : undefined}
          data-full-width-responsive={format === 'auto' ? 'true' : undefined}
        />
      </div>
    );
  }

  // Visual Ad Placement Box (AdSense Ready)
  return (
    <div className={`flex justify-center ${className}`}>
      <div
        className={`${currentDim.size} rounded-2xl border border-dashed border-primary/30 bg-gradient-to-br from-primary/5 via-card/60 to-secondary/5 backdrop-blur-sm flex flex-col items-center justify-center p-3 text-center select-none transition-all hover:border-primary/50`}
      >
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary mb-1">
          <Sparkles className="w-2.5 h-2.5" />
          <span>Sponsorlu Reklam Alanı</span>
        </span>
        <p className="text-xs font-medium text-muted-foreground">
          {label || currentDim.text}
        </p>
        <span className="text-[10px] text-muted-foreground/60 mt-0.5">
          Google AdSense • {slotId}
        </span>
      </div>
    </div>
  );
}
