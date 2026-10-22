'use client';

import {
  Download, Music, FileStack, Sparkles,
  UserX, Zap, Languages, Smartphone
} from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

const features = [
  { key: 'videoDownload', icon: Download, color: 'text-blue-500 bg-blue-500/10' },
  { key: 'mp3Conversion', icon: Music, color: 'text-purple-500 bg-purple-500/10' },
  { key: 'multipleFormats', icon: FileStack, color: 'text-indigo-500 bg-indigo-500/10' },
  { key: 'highQuality', icon: Sparkles, color: 'text-amber-500 bg-amber-500/10' },
  { key: 'noRegistration', icon: UserX, color: 'text-emerald-500 bg-emerald-500/10' },
  { key: 'freeAccess', icon: Zap, color: 'text-orange-500 bg-orange-500/10' },
  { key: 'multilingualSupport', icon: Languages, color: 'text-teal-500 bg-teal-500/10' },
  { key: 'mobileFriendly', icon: Smartphone, color: 'text-pink-500 bg-pink-500/10' },
];

export default function FeaturesSection() {
  const { t } = useI18n();

  return (
    <section className="py-16 md:py-24">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            {t('features.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            const [iconColor, iconBg] = feature.color.split(' ');
            return (
              <div
                key={feature.key}
                className="glass-card p-6 group"
              >
                <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${iconColor}`} />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  {t(`features.items.${feature.key}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`features.items.${feature.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
