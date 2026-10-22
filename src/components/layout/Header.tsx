'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { 
  Menu, X, Sun, Moon, Monitor, Globe, ChevronDown 
} from 'lucide-react';
import { useTheme } from '@/lib/theme/ThemeProvider';
import { localeNames, locales } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/context';

export default function Header() {
  const { lang, t } = useI18n();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();
  const langRef = useRef<HTMLDivElement>(null);
  const themeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangMenuOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const videoConvLabel = lang === 'tr' ? 'Video/Ses Çevirici' : lang === 'ar' ? 'محول الفيديو' : 'Video Converter';
  const imageConvLabel = lang === 'tr' ? 'Resim Çevirici' : lang === 'ar' ? 'محول الصور' : 'Image Converter';
  const audioCutterLabel = lang === 'tr' ? 'MP3 Kesici' : lang === 'ar' ? 'قص الصوت' : 'MP3 Cutter';

  const navItems = [
    { href: `/${lang}`, label: t('nav.home') },
    { href: `/${lang}/video-converter`, label: videoConvLabel },
    { href: `/${lang}/image-converter`, label: imageConvLabel },
    { href: `/${lang}/audio-cutter`, label: audioCutterLabel },
    { href: `/${lang}#platforms`, label: t('nav.supportedPlatforms') },
    { href: `/${lang}/blog`, label: t('nav.blog') },
    { href: `/${lang}/faq`, label: t('nav.faq') },
  ];

  const themeOptions = [
    { value: 'light' as const, icon: Sun, label: t('theme.light') },
    { value: 'dark' as const, icon: Moon, label: t('theme.dark') },
    { value: 'system' as const, icon: Monitor, label: t('theme.system') },
  ];

  const isRtl = lang === 'ar';

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-all duration-200 border-b ${
        scrolled
          ? 'shadow-md backdrop-blur-xl bg-[var(--nav-bg)] border-border/80'
          : 'backdrop-blur-md bg-[var(--nav-bg)] border-transparent'
      }`}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="container-custom">
        <div className="flex items-center justify-between h-16 md:h-18">
          {/* Logo */}
          <Link href={`/${lang}`} className="flex items-center gap-2 shrink-0">
            <Image
              src="/images/logo.svg"
              alt="Vidnoria"
              width={140}
              height={36}
              className="h-8 w-auto dark:hidden"
              priority
            />
            <Image
              src="/images/logo-dark.svg"
              alt="Vidnoria"
              width={140}
              height={36}
              className="h-8 w-auto hidden dark:block"
              priority
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3.5 py-2 text-sm font-medium text-foreground/80 hover:text-foreground rounded-lg hover:bg-accent transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Language Selector */}
            <div ref={langRef} className="relative">
              <button
                onClick={() => {
                  setLangMenuOpen(!langMenuOpen);
                  setThemeMenuOpen(false);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground/80 hover:text-foreground rounded-lg hover:bg-accent transition-colors"
                aria-label="Change language"
              >
                <Globe className="w-4 h-4 text-primary" />
                <span className="hidden sm:inline">{localeNames[lang]}</span>
                <ChevronDown className="w-3 h-3 opacity-60" />
              </button>
              
              {langMenuOpen && (
                <div className="absolute top-full mt-1.5 end-0 bg-card border border-border rounded-xl shadow-xl py-1.5 min-w-[140px] animate-scale-in z-50">
                  {locales.map((locale) => (
                    <Link
                      key={locale}
                      href={`/${locale}`}
                      className={`flex items-center px-4 py-2 text-sm hover:bg-accent transition-colors ${
                        locale === lang ? 'text-primary font-bold' : 'text-foreground/80'
                      }`}
                      onClick={() => setLangMenuOpen(false)}
                    >
                      {localeNames[locale]}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Theme Selector (Hydration Safe) */}
            <div ref={themeRef} className="relative">
              <button
                onClick={() => {
                  setThemeMenuOpen(!themeMenuOpen);
                  setLangMenuOpen(false);
                }}
                className="flex items-center justify-center w-9 h-9 text-foreground/80 hover:text-foreground rounded-lg hover:bg-accent transition-colors"
                aria-label="Change theme"
                suppressHydrationWarning
              >
                {!mounted ? (
                  <Monitor className="w-4 h-4 opacity-70" />
                ) : theme === 'dark' ? (
                  <Moon className="w-4 h-4 text-primary" />
                ) : theme === 'light' ? (
                  <Sun className="w-4 h-4 text-amber-500" />
                ) : (
                  <Monitor className="w-4 h-4" />
                )}
              </button>

              {themeMenuOpen && (
                <div className="absolute top-full mt-1.5 end-0 bg-card border border-border rounded-xl shadow-xl py-1.5 min-w-[150px] animate-scale-in z-50">
                  {themeOptions.map(({ value, icon: Icon, label }) => (
                    <button
                      key={value}
                      onClick={() => {
                        setTheme(value);
                        setThemeMenuOpen(false);
                      }}
                      className={`flex items-center gap-3 w-full px-4 py-2 text-sm hover:bg-accent transition-colors ${
                        theme === value ? 'text-primary font-bold' : 'text-foreground/80'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden flex items-center justify-center w-9 h-9 text-foreground/80 hover:text-foreground rounded-lg hover:bg-accent transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-card/98 backdrop-blur-xl animate-slide-down">
          <nav className="container-custom py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block px-4 py-2.5 text-sm font-medium text-foreground/80 hover:text-foreground rounded-lg hover:bg-accent transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
