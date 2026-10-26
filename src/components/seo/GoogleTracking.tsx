'use client';

import { useEffect, useState } from 'react';
import { getSiteSettingsClient } from '@/lib/client-api';

interface GoogleTrackingProps {
  defaultGaId?: string;
  defaultGtmId?: string;
}

/**
 * Loads Google Analytics 4 (gtag.js) and Google Tag Manager (gtm.js)
 * from environment variables or Admin Panel settings (localStorage / site.json).
 */
export default function GoogleTracking({
  defaultGaId = process.env.NEXT_PUBLIC_GA_ID || '',
  defaultGtmId = process.env.NEXT_PUBLIC_GTM_ID || '',
}: GoogleTrackingProps) {
  const [gaId, setGaId] = useState(defaultGaId);
  const [gtmId, setGtmId] = useState(defaultGtmId);

  useEffect(() => {
    let cancelled = false;
    const syncFromSettings = async () => {
      try {
        const parsed = await getSiteSettingsClient();
        if (cancelled || !parsed) return;
        if (parsed.seo?.googleAnalyticsId !== undefined) {
          setGaId(parsed.seo.googleAnalyticsId.trim());
        }
        if (parsed.seo?.googleTagManagerId !== undefined) {
          setGtmId(parsed.seo.googleTagManagerId.trim());
        }
      } catch {
        // ignore
      }
    };

    syncFromSettings();
    window.addEventListener('storage', syncFromSettings);
    return () => {
      cancelled = true;
      window.removeEventListener('storage', syncFromSettings);
    };
  }, []);

  // Inject Google Analytics 4 (gtag.js)
  useEffect(() => {
    if (!gaId) return;
    const scriptId = 'ga4-gtag-script';
    if (document.getElementById(scriptId)) return;

    const s1 = document.createElement('script');
    s1.id = scriptId;
    s1.async = true;
    s1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
    document.head.appendChild(s1);

    const s2 = document.createElement('script');
    s2.id = 'ga4-gtag-init';
    s2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.head.appendChild(s2);
  }, [gaId]);

  // Inject Google Tag Manager (gtm.js)
  useEffect(() => {
    if (!gtmId) return;
    const scriptId = 'gtm-head-script';
    if (document.getElementById(scriptId)) return;

    const s = document.createElement('script');
    s.id = scriptId;
    s.innerHTML = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${gtmId}');
    `;
    document.head.appendChild(s);
  }, [gtmId]);

  if (!gtmId) return null;

  return (
    <noscript>
      <iframe
        title="Google Tag Manager"
        aria-hidden="true"
        loading="lazy"
        src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(gtmId)}`}
        height="0"
        width="0"
        style={{ display: 'none', visibility: 'hidden' }}
      />
    </noscript>
  );
}
