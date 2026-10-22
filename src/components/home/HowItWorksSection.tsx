'use client';

import { ClipboardPaste, Search, ListFilter, Download } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

const steps = [
  { key: 'paste', icon: ClipboardPaste, color: 'from-blue-500 to-blue-600' },
  { key: 'analyze', icon: Search, color: 'from-purple-500 to-purple-600' },
  { key: 'choose', icon: ListFilter, color: 'from-violet-500 to-violet-600' },
  { key: 'download', icon: Download, color: 'from-emerald-500 to-emerald-600' },
];

export default function HowItWorksSection() {
  const { t } = useI18n();

  return (
    <section className="py-16 md:py-24 bg-muted/30">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            {t('howItWorks.title')}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8 max-w-5xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.key}
                className="relative text-center group"
              >
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-10 start-[calc(50%+2rem)] end-[calc(-50%+2rem)] h-0.5 bg-border" />
                )}
                
                <div className="relative inline-flex items-center justify-center mb-5">
                  <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <span className="absolute -top-2 -end-2 w-7 h-7 bg-primary text-primary-foreground text-xs font-bold rounded-full flex items-center justify-center shadow-md">
                    {index + 1}
                  </span>
                </div>

                <h3 className="text-lg font-semibold mb-2">
                  {t(`howItWorks.steps.${step.key}.title`)}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {t(`howItWorks.steps.${step.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
