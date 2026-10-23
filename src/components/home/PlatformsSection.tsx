'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import type { Platform } from '@/types';
import { useI18n } from '@/lib/i18n/context';
import { getSiteSettingsClient } from '@/lib/client-api';

const platforms: { id: Platform; icon: string; color: string }[] = [
  { id: 'youtube', icon: '/images/platforms/youtube.svg', color: 'from-red-500/10 to-red-600/5' },
  { id: 'instagram', icon: '/images/platforms/instagram.svg', color: 'from-pink-500/10 to-purple-600/5' },
  { id: 'tiktok', icon: '/images/platforms/tiktok.svg', color: 'from-slate-800/10 to-pink-500/5' },
  { id: 'facebook', icon: '/images/platforms/facebook.svg', color: 'from-blue-600/10 to-blue-700/5' },
  { id: 'twitter', icon: '/images/platforms/twitter.svg', color: 'from-slate-700/10 to-slate-800/5' },
];

export default function PlatformsSection() {
  const { t } = useI18n();
  const [enabledMap, setEnabledMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const parsed = await getSiteSettingsClient();
        if (cancelled || !parsed?.platforms) return;
        const map: Record<string, boolean> = {};
        for (const [k, v] of Object.entries(parsed.platforms)) {
          map[k] = (v as { enabled?: boolean } | undefined)?.enabled !== false;
        }
        setEnabledMap(map);
      } catch {
        // ignore
      }
    };
    load();
    window.addEventListener('storage', load);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', load);
    };
  }, []);

  const visiblePlatforms = platforms.filter((p) => enabledMap[p.id] !== false);

  return (
    <section id="platforms" className="py-16 md:py-24">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            {t('platforms.title')}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('platforms.subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 max-w-4xl mx-auto">
          {visiblePlatforms.map((platform) => (
            <div
              key={platform.id}
              className="glass-card group flex flex-col items-center justify-center p-6 md:p-8 text-center cursor-default"
            >
              <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-gradient-to-br ${platform.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Image
                  src={platform.icon}
                  alt={t(`platforms.${platform.id}`)}
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
              </div>
              <span className="text-sm font-semibold text-foreground">
                {t(`platforms.${platform.id}`)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
