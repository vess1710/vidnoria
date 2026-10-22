'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Heart } from 'lucide-react';
import { localeNames, locales } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/context';

export default function Footer() {
  const { lang, t } = useI18n();
  const currentYear = new Date().getFullYear();
  const isRtl = lang === 'ar';

  const videoConvLabel = lang === 'tr' ? 'Video & Ses Dönüştürücü' : lang === 'ar' ? 'محول الفيديو والصوت' : 'Video & Audio Converter';
  const imageConvLabel = lang === 'tr' ? 'Resim Uzantı Dönüştürücü' : lang === 'ar' ? 'محول صيغ الصور' : 'Image Format Converter';

  const quickLinks = [
    { href: `/${lang}`, label: t('nav.home') },
    { href: `/${lang}/video-converter`, label: videoConvLabel },
    { href: `/${lang}/image-converter`, label: imageConvLabel },
    { href: `/${lang}#platforms`, label: t('nav.supportedPlatforms') },
    { href: `/${lang}/blog`, label: t('nav.blog') },
    { href: `/${lang}/faq`, label: t('nav.faq') },
    { href: `/${lang}/contact`, label: t('legal.contact') },
    { href: '/admin', label: t('admin.dashboard') },
  ];

  const legalLinks = [
    { href: `/${lang}/privacy`, label: t('legal.privacyPolicy') },
    { href: `/${lang}/terms`, label: t('legal.termsOfUse') },
    { href: `/${lang}/copyright`, label: t('legal.copyrightNotice') },
    { href: `/${lang}/disclaimer`, label: t('legal.disclaimer') },
    { href: `/${lang}/cookies`, label: t('legal.cookiePolicy') },
  ];

  return (
    <footer
      className="border-t border-border bg-muted/30 mt-auto"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="container-custom py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href={`/${lang}`} className="inline-block mb-4">
              <Image
                src="/images/logo.svg"
                alt="Vidnoria"
                width={140}
                height={36}
                className="h-8 w-auto dark:hidden"
              />
              <Image
                src="/images/logo-dark.svg"
                alt="Vidnoria"
                width={140}
                height={36}
                className="h-8 w-auto hidden dark:block"
              />
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('footer.description')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              {t('footer.quickLinks')}
            </h3>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              {t('footer.legal')}
            </h3>
            <ul className="space-y-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Languages */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">
              {t('footer.languages')}
            </h3>
            <ul className="space-y-2.5">
              {locales.map((locale) => (
                <li key={locale}>
                  <Link
                    href={`/${locale}`}
                    className={`text-sm transition-colors ${
                      locale === lang
                        ? 'text-primary font-medium'
                        : 'text-muted-foreground hover:text-primary'
                    }`}
                  >
                    {localeNames[locale]}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {t('footer.copyright', { year: currentYear })}
          </p>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            {t('footer.madeWith').split('❤️')[0]}
            <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
            {t('footer.madeWith').split('❤️')[1]}
          </p>
        </div>
      </div>
    </footer>
  );
}
