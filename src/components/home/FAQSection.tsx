'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

interface FAQSectionProps {
  items?: { question: string; answer: string }[];
}

export default function FAQSection({ items }: FAQSectionProps) {
  const { t } = useI18n();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqItems = items || [];

  const resolvedItems = faqItems.length > 0 ? faqItems : (() => {
    const result: { question: string; answer: string }[] = [];
    for (let i = 0; i < 10; i++) {
      const q = t(`faq.items.${i}.question`);
      const a = t(`faq.items.${i}.answer`);
      if (q.startsWith('faq.items.')) break;
      result.push({ question: q, answer: a });
    }
    return result;
  })();

  return (
    <section className="py-16 md:py-24">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4">
            {t('faq.title')}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('faq.subtitle')}
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3">
          {resolvedItems.map((item, index) => (
            <div
              key={index}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? null : index)}
                className="w-full flex items-center justify-between gap-4 p-5 text-start hover:bg-accent/30 transition-colors"
                aria-expanded={openIndex === index}
              >
                <h3 className="font-medium text-foreground text-base m-0 text-start">
                  {item.question}
                </h3>
                <ChevronDown
                  className={`w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </button>
              <div
                className="accordion-content"
                data-open={openIndex === index}
              >
                <div>
                  <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">
                    {item.answer}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
