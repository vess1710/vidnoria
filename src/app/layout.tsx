import type { Metadata, Viewport } from 'next';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import GoogleTracking from '@/components/seo/GoogleTracking';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0e1a' },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL('https://vidnoria.com'),
  title: {
    default: 'Vidnoria - Ücretsiz Online Video ve Müzik İndirici (MP4 & MP3)',
    template: '%s | Vidnoria',
  },
  description:
    'Vidnoria ile YouTube, Instagram, TikTok ve Twitter videolarını yüksek kalitede, ücretsiz ve programsız MP4 ile MP3 formatında anında indirin ve dönüştürün.',
  keywords: [
    'video indir',
    'ücretsiz video indir',
    'youtube video indir',
    'youtube mp3 indir',
    'youtube mp3 dönüştürücü',
    'youtube mp4 indir',
    'instagram video indir',
    'instagram reels indir',
    'tiktok video indir',
    'tiktok filigransız video indir',
    'twitter video indir',
    'x video indir',
    'facebook video indir',
    'online video indirici',
    'müzik indir',
    'mp3 dönüştürücü',
    'hd video indir',
    '4k video indir',
    'programsız video indir',
    'vidnoria',
  ],
  authors: [{ name: 'Vidnoria', url: 'https://vidnoria.com' }],
  creator: 'Vidnoria',
  publisher: 'Vidnoria',
  applicationName: 'Vidnoria',
  formatDetection: {
    telephone: false,
  },
  alternates: {
    canonical: 'https://vidnoria.com/tr',
    languages: {
      tr: 'https://vidnoria.com/tr',
      en: 'https://vidnoria.com/en',
      ar: 'https://vidnoria.com/ar',
      'x-default': 'https://vidnoria.com/tr',
    },
  },
  openGraph: {
    title: 'Vidnoria - Ücretsiz Online Video ve Müzik İndirici',
    description:
      'Vidnoria ile YouTube, Instagram, TikTok, Facebook ve Twitter videolarını yüksek kalitede, ücretsiz ve programsız MP4 ve MP3 formatında anında indirin.',
    url: 'https://vidnoria.com',
    siteName: 'Vidnoria',
    locale: 'tr_TR',
    type: 'website',
    images: [
      {
        url: 'https://vidnoria.com/images/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Vidnoria - Online Video ve Müzik İndirici',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Vidnoria - Ücretsiz Online Video ve Müzik İndirici',
    description:
      'YouTube, Instagram, TikTok, Facebook ve Twitter videolarını programsız, ücretsiz ve yüksek hızda indirin.',
    images: ['https://vidnoria.com/images/og-image.svg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'PlAR_ihtFqyAIvHZPYltHb-Rueh_Dl6EqJ5b2eV0bZg',
  },
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/images/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/images/logo-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.ico',
  },
};

const globalSchemas = [
  {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Vidnoria',
    url: 'https://vidnoria.com',
    logo: 'https://vidnoria.com/images/logo-icon.svg',
    description:
      'Ücretsiz online video indirme, MP3 dönüştürme ve medya format çevirme platformu.',
    sameAs: [],
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Vidnoria',
    url: 'https://vidnoria.com',
    description:
      'YouTube, Instagram, TikTok, Twitter ve Facebook videolarını tek tıkla indirin.',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://vidnoria.com/tr/download?url={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Vidnoria Online Video Downloader',
    url: 'https://vidnoria.com',
    description:
      'Tüm popüler platformlardan yüksek kalitede MP4 ve MP3 indirme aracı.',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'All',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    softwareVersion: '2.0',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      ratingCount: '1240',
      bestRating: '5',
      worstRating: '1',
    },
  },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="PlAR_ihtFqyAIvHZPYltHb-Rueh_Dl6EqJ5b2eV0bZg" />
        <meta name="google-adsense-account" content="ca-pub-4211004489667670" />
        <meta name="author" content="Vidnoria" />
        <meta name="publisher" content="Vidnoria" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/images/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/images/logo-icon.svg" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(globalSchemas) }}
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4211004489667670"
          crossOrigin="anonymous"
        />
        {/* Prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('vidnoria-theme') || 'system';
                  document.documentElement.setAttribute('data-theme', theme);
                  if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <GoogleTracking />
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
