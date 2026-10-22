'use client';

import { useState } from 'react';
import { Send, CheckCircle2 } from 'lucide-react';
import { Locale } from '@/lib/i18n';

interface ContactFormProps {
  locale: Locale;
}

export default function ContactForm({ locale }: ContactFormProps) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="glass-card p-8 text-center space-y-3">
        <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
        <h3 className="font-bold text-base">
          {locale === 'tr' ? 'Mesajınız Alındı' : locale === 'en' ? 'Message Received' : 'تم استلام رسالتك'}
        </h3>
        <p className="text-xs text-muted-foreground">
          {locale === 'tr'
            ? 'En kısa sürede e-posta adresiniz üzerinden geri dönüş yapacağız.'
            : locale === 'en'
            ? 'We will get back to you via your email address shortly.'
            : 'سنقوم بالرد عليك عبر بريدك الإلكتروني في أقرب وقت ممكن.'}
        </p>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 md:p-8">
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-xs font-semibold mb-1.5 text-foreground">
            {locale === 'tr' ? 'Adınız' : locale === 'en' ? 'Your Name' : 'اسمك'}
          </label>
          <input
            type="text"
            required
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-card/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 text-foreground">
            {locale === 'tr' ? 'E-Posta Adresiniz' : locale === 'en' ? 'Email Address' : 'البريد الإلكتروني'}
          </label>
          <input
            type="email"
            required
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-card/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold mb-1.5 text-foreground">
            {locale === 'tr' ? 'Mesajınız' : locale === 'en' ? 'Your Message' : 'رسالتك'}
          </label>
          <textarea
            rows={4}
            required
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-card/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full gradient-bg text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Send className="w-4 h-4" />
          <span>{locale === 'tr' ? 'Mesajı Gönder' : locale === 'en' ? 'Send Message' : 'إرسال الرسالة'}</span>
        </button>
      </form>
    </div>
  );
}
