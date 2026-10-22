import type { Metadata } from 'next';
import { ThemeProvider } from '@/lib/theme/ThemeProvider';
import GoogleTracking from '@/components/seo/GoogleTracking';
import './globals.css';

export const metadata: Metadata = {
  title: 'Vidnoria - Video & Music Downloader',
  description: 'Download videos and music from supported platforms. Free, fast and secure.',
  verification: {
    google: 'PlAR_ihtFqyAIvHZPYltHb-Rueh_Dl6EqJ5b2eV0bZg',
  },
  icons: {
    icon: '/images/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      <head>
        <meta name="google-site-verification" content="PlAR_ihtFqyAIvHZPYltHb-Rueh_Dl6EqJ5b2eV0bZg" />
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
