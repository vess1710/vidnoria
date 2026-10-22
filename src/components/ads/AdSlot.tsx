'use client';

import { useEffect, useRef } from 'react';
import { Sparkles } from 'lucide-react';

interface AdSlotProps {
  slotId: string;
  format?: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  className?: string;
  publisherId?: string;
  label?: string;
}

/**
 * Google AdSense & Visual Ad Slot Component.
 * Renders live AdSense ads when publisherId is configured, or a clean visual
 * ad placement box so layout & ad positions (left/right rails, banners) are clearly visible.
 */
export default function AdSlot({
  slotId,
  format = 'auto',
  className = '',
  publisherId,
  label,
}: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    if (!slotId || !publisherId) return;

    try {
      const win = window as unknown as { adsbygoogle?: unknown[] };
      if (win.adsbygoogle) {
        win.adsbygoogle.push({});
      }
    } catch {
      // ignore
    }
  }, [slotId, publisherId]);

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

  // If live AdSense publisherId is provided, render the real AdSense unit
  if (publisherId && slotId) {
    return (
      <div className={`flex justify-center my-2 ${className}`}>
        <ins
          ref={adRef}
          className={`adsbygoogle block ${currentDim.size}`}
          style={{ display: 'block' }}
          data-ad-client={`ca-pub-${publisherId}`}
          data-ad-slot={slotId}
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
