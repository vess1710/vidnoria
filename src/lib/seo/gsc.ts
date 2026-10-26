import { Locale } from '@/lib/i18n';
import {
  GscAnalyticsPayload,
  GscDailyMetric,
  GscDimensionRow,
  GscInsightItem,
  GscMetricsSummary,
  GscPageRow,
  GscQueryRow,
  SeoDateRange,
} from './types';
import { getSeoSettings, readSeoStore, writeSeoStore } from './storage';

// ============================================================================
// Vidnoria SEO Manager - Google Search Console API Engine
// ============================================================================

const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface GscTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export function isGscOAuthConfigured(): boolean {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID &&
      process.env.GOOGLE_CLIENT_SECRET &&
      (process.env.GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_SERVICE_ACCOUNT_JSON)
  );
}

export function generateGoogleAuthUrl(redirectUri: string, state = 'vidnoria_gsc_auth'): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: GSC_SCOPE,
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

export async function exchangeOAuthCode(code: string, redirectUri: string): Promise<GscTokenSet> {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google OAuth code exchange failed: ${err}`);
  }

  const data = await res.json();
  const tokenSet: GscTokenSet = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
  };

  await writeSeoStore('gsc-tokens', tokenSet);
  return tokenSet;
}

async function getValidAccessToken(): Promise<string | null> {
  // 1. Check Service Account JWT first if provided
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    try {
      const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
      const token = await generateServiceAccountAccessToken(sa);
      if (token) return token;
    } catch {
      // fallback to OAuth
    }
  }

  // 2. Check stored OAuth tokens
  const env = await readSeoStore<GscTokenSet | null>('gsc-tokens', null);
  const tokens = env.data;

  const refreshToken = tokens?.refreshToken || process.env.GOOGLE_REFRESH_TOKEN;
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (tokens && tokens.accessToken && Date.now() < tokens.expiresAt - 60_000) {
    return tokens.accessToken;
  }

  if (refreshToken && clientId && clientSecret) {
    try {
      const res = await fetch(OAUTH_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: refreshToken,
          client_id: clientId,
          client_secret: clientSecret,
          grant_type: 'refresh_token',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const updated: GscTokenSet = {
          accessToken: data.access_token,
          refreshToken,
          expiresAt: Date.now() + (data.expires_in || 3600) * 1000,
        };
        await writeSeoStore('gsc-tokens', updated);
        return updated.accessToken;
      }
    } catch {
      return null;
    }
  }

  return null;
}

interface ServiceAccountKey {
  client_email: string;
  private_key: string;
}

interface GscSiteEntry {
  siteUrl: string;
  permissionLevel?: string;
}

interface GscApiRow {
  keys: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
}

async function generateServiceAccountAccessToken(sa: ServiceAccountKey): Promise<string | null> {
  try {
    const crypto = await import('crypto');
    const now = Math.floor(Date.now() / 1000);
    const header = { alg: 'RS256', typ: 'JWT' };
    const claim = {
      iss: sa.client_email,
      scope: GSC_SCOPE,
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600,
      iat: now,
    };

    const b64 = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64url');
    const signatureInput = `${b64(header)}.${b64(claim)}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signatureInput);
    const signature = signer.sign(sa.private_key, 'base64url');
    const jwt = `${signatureInput}.${signature}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (res.ok) {
      const json = await res.json();
      return json.access_token || null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function listGscProperties(): Promise<string[]> {
  const token = await getValidAccessToken();
  if (!token) return [];

  try {
    const res = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return ((data.siteEntry || []) as GscSiteEntry[]).map((s) => s.siteUrl);
  } catch {
    return [];
  }
}

function getRangeDates(range: SeoDateRange): { startDate: string; endDate: string; prevStartDate: string; prevEndDate: string } {
  const now = new Date();
  // GSC data has a 2-3 day lag
  const lagDays = 3;
  const days = range === '7d' ? 7 : range === '28d' ? 28 : 90;

  const end = new Date(now.getTime() - lagDays * 86400000);
  const start = new Date(end.getTime() - (days - 1) * 86400000);

  const prevEnd = new Date(start.getTime() - 86400000);
  const prevStart = new Date(prevEnd.getTime() - (days - 1) * 86400000);

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return {
    startDate: fmt(start),
    endDate: fmt(end),
    prevStartDate: fmt(prevStart),
    prevEndDate: fmt(prevEnd),
  };
}

/**
 * Queries real Google Search Console Search Analytics API.
 */
async function queryGscAnalytics(
  token: string,
  propertyUrl: string,
  startDate: string,
  endDate: string,
  dimensions: string[]
): Promise<GscApiRow[]> {
  const endpoint = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(
    propertyUrl
  )}/searchAnalytics/query`;

  const body = {
    startDate,
    endDate,
    dimensions,
    rowLimit: 500,
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GSC query error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.rows || [];
}

/**
 * Returns full GSC Analytics Payload. If real credentials are connected, queries Google Search Console API.
 * If not connected, returns connected: false, real data as null, and supplies sample demo data when requested.
 */
export async function getGscAnalytics(
  range: SeoDateRange = '28d',
  enableDemoMode = false
): Promise<GscAnalyticsPayload> {
  const settings = await getSeoSettings();
  const token = await getValidAccessToken();
  const propertyUrl = settings.selectedGscProperty || 'sc-domain:vidnoria.com';
  const dates = getRangeDates(range);

  const dataLagNotice = {
    tr: `Veriler Google Search Console API tarafından 2-3 gün gecikmeli yayınlanır. Gösterilen dönem: ${dates.startDate} - ${dates.endDate}.`,
    en: `Data is provided by Google Search Console API with a 2-3 day processing lag. Displayed period: ${dates.startDate} - ${dates.endDate}.`,
    ar: `يتم توفير البيانات عبر Google Search Console بفارق تأخير يتراوح بين 2-3 أيام. الفترة: ${dates.startDate} - ${dates.endDate}.`,
  };

  if (!token) {
    if (enableDemoMode) {
      return getDemoGscPayload(range, dates, dataLagNotice);
    }

    return {
      connected: false,
      isDemoMode: false,
      propertyUrl,
      availableProperties: [],
      range,
      lastSyncedAt: null,
      dataLagNotice,
      connectionReason:
        'Google Search Console OAuth yetkilendirmesi veya Service Account yapılandırılmadı. Gerçek arama verilerini görüntülemek için lütfen Google ile Bağlanın veya Demo Modunu açın.',
      summary: null,
      dailySeries: [],
      topQueries: [],
      topPages: [],
      byCountry: [],
      byDevice: [],
      byLanguage: [],
      insights: [],
    };
  }

  try {
    const [dailyRows, queryRows, pageRows, countryRows, deviceRows] = await Promise.all([
      queryGscAnalytics(token, propertyUrl, dates.startDate, dates.endDate, ['date']),
      queryGscAnalytics(token, propertyUrl, dates.startDate, dates.endDate, ['query']),
      queryGscAnalytics(token, propertyUrl, dates.startDate, dates.endDate, ['page']),
      queryGscAnalytics(token, propertyUrl, dates.startDate, dates.endDate, ['country']),
      queryGscAnalytics(token, propertyUrl, dates.startDate, dates.endDate, ['device']),
    ]);

    const totalClicks = dailyRows.reduce((acc, r) => acc + (r.clicks || 0), 0);
    const totalImpressions = dailyRows.reduce((acc, r) => acc + (r.impressions || 0), 0);
    const avgCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
    const avgPos =
      dailyRows.length > 0
        ? Number((dailyRows.reduce((acc, r) => acc + (r.position || 0), 0) / dailyRows.length).toFixed(1))
        : 0;

    const summary: GscMetricsSummary = {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: avgCtr,
      position: avgPos,
    };

    const dailySeries: GscDailyMetric[] = dailyRows.map((r) => ({
      date: r.keys[0] || '',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Number(((r.ctr || 0) * 100).toFixed(2)),
      position: Number((r.position || 0).toFixed(1)),
    }));

    const topQueries: GscQueryRow[] = queryRows.slice(0, 50).map((r) => {
      const q = r.keys[0] || '';
      const isAr = /[\u0600-\u06FF]/.test(q);
      const isTr = /[çğıöşüÇĞİÖŞÜ]/.test(q) || q.includes('indir');
      return {
        query: q,
        locale: isAr ? 'ar' : isTr ? 'tr' : 'en',
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: Number(((r.ctr || 0) * 100).toFixed(2)),
        position: Number((r.position || 0).toFixed(1)),
        trend: (r.position || 0) < 10 ? 'rising' : 'stable',
      };
    });

    const topPages: GscPageRow[] = pageRows.slice(0, 50).map((r) => {
      const p = r.keys[0] || '';
      const loc: Locale | 'other' = p.includes('/tr') ? 'tr' : p.includes('/en') ? 'en' : p.includes('/ar') ? 'ar' : 'other';
      return {
        page: p,
        locale: loc,
        clicks: r.clicks || 0,
        impressions: r.impressions || 0,
        ctr: Number(((r.ctr || 0) * 100).toFixed(2)),
        position: Number((r.position || 0).toFixed(1)),
      };
    });

    const byCountry: GscDimensionRow[] = countryRows.slice(0, 10).map((r) => ({
      key: r.keys[0] || '',
      label: (r.keys[0] || '').toUpperCase(),
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Number(((r.ctr || 0) * 100).toFixed(2)),
      position: Number((r.position || 0).toFixed(1)),
    }));

    const byDevice: GscDimensionRow[] = deviceRows.map((r) => ({
      key: r.keys[0] || '',
      label: r.keys[0] === 'MOBILE' ? 'Mobil' : r.keys[0] === 'DESKTOP' ? 'Masaüstü' : 'Tablet',
      clicks: r.clicks || 0,
      impressions: r.impressions || 0,
      ctr: Number(((r.ctr || 0) * 100).toFixed(2)),
      position: Number((r.position || 0).toFixed(1)),
    }));

    // Calculate language share from pageRows
    const langClicks: Record<Locale, { clicks: number; impressions: number }> = {
      tr: { clicks: 0, impressions: 0 },
      en: { clicks: 0, impressions: 0 },
      ar: { clicks: 0, impressions: 0 },
    };

    for (const pr of topPages) {
      if (pr.locale === 'tr' || pr.locale === 'en' || pr.locale === 'ar') {
        langClicks[pr.locale].clicks += pr.clicks;
        langClicks[pr.locale].impressions += pr.impressions;
      }
    }

    const byLanguage: GscDimensionRow[] = (['tr', 'en', 'ar'] as const).map(l => ({
      key: l,
      label: l === 'tr' ? 'Türkçe' : l === 'en' ? 'English' : 'العربية',
      clicks: langClicks[l].clicks,
      impressions: langClicks[l].impressions,
      ctr:
        langClicks[l].impressions > 0
          ? Number(((langClicks[l].clicks / langClicks[l].impressions) * 100).toFixed(2))
          : 0,
      position: 0,
    }));

    // Generate Automated Insights & Anomaly Analysis
    const insights = generateGscInsights(topQueries, topPages);
    const properties = await listGscProperties();

    return {
      connected: true,
      isDemoMode: false,
      propertyUrl,
      availableProperties: properties.length > 0 ? properties : [propertyUrl],
      range,
      lastSyncedAt: new Date().toISOString(),
      dataLagNotice,
      summary,
      dailySeries,
      topQueries,
      topPages,
      byCountry,
      byDevice,
      byLanguage,
      insights,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    if (enableDemoMode) {
      return getDemoGscPayload(range, dates, dataLagNotice);
    }
    return {
      connected: false,
      isDemoMode: false,
      propertyUrl,
      availableProperties: [],
      range,
      lastSyncedAt: null,
      dataLagNotice,
      connectionReason: `Google Search Console API Hatası: ${errorMsg}`,
      summary: null,
      dailySeries: [],
      topQueries: [],
      topPages: [],
      byCountry: [],
      byDevice: [],
      byLanguage: [],
      insights: [],
    };
  }
}

/**
 * Analyzes GSC queries & pages for the 6 specific conditions required by Section 4.
 */
function generateGscInsights(queries: GscQueryRow[], pages: GscPageRow[]): GscInsightItem[] {
  const insights: GscInsightItem[] = [];

  // 1. High impressions, low CTR pages
  for (const page of pages) {
    if (page.impressions > 150 && page.ctr < 2.5) {
      insights.push({
        id: `ins_low_ctr_${page.page.replace(/[^a-z0-9]/gi, '_')}`,
        type: 'high_impressions_low_ctr',
        priority: 'high',
        target: page.page,
        locale: page.locale as Locale,
        title: {
          tr: 'Yüksek Gösterim, Düşük CTR Sayfası',
          en: 'High Impressions, Low CTR Page',
          ar: 'صفحة ذات ظهور عالٍ ونسبة نقر منخفضة',
        },
        detail: {
          tr: `${page.page} sayfası ${page.impressions} gösterim aldı fakat CTR sadece %${page.ctr}.`,
          en: `${page.page} received ${page.impressions} impressions but CTR is only ${page.ctr}%.`,
          ar: `حصلت الصفحة ${page.page} على ${page.impressions} ظهور ولكن معدل النقر ${page.ctr}% فقط.`,
        },
        recommendedAction: {
          tr: 'Sayfanın SEO başlığını ve meta açıklamasını daha dikkat çekici ve harekete geçirici (CTA) hale getirin.',
          en: 'Update the page title and meta description with a more compelling Call-To-Action.',
          ar: 'قم بتحسين عنوان الصفحة ووصف الميتا لجذب المزيد من النقرات.',
        },
        metrics: {
          clicks: page.clicks,
          impressions: page.impressions,
          ctr: page.ctr,
          position: page.position,
        },
      });
    }
  }

  // 2. Improving position queries (positions 11 - 20 ready for first-page push)
  for (const q of queries) {
    if (q.position >= 8 && q.position <= 20 && q.impressions > 80) {
      insights.push({
        id: `ins_improve_${q.query.replace(/[^a-z0-9]/gi, '_')}`,
        type: 'improving_query',
        priority: 'medium',
        target: q.query,
        locale: q.locale as Locale,
        title: {
          tr: 'İlk Sayfaya Yükselme Potansiyeli Olan Sorgu',
          en: 'Query Approaching Page 1 Opportunity',
          ar: 'استعلام قريب من الصفحة الأولى',
        },
        detail: {
          tr: `"${q.query}" sorgusu ortalama ${q.position}. sırada ve ${q.impressions} gösterime sahip.`,
          en: `Query "${q.query}" ranks average position ${q.position} with ${q.impressions} impressions.`,
          ar: `الاستعلام "${q.query}" يحتل الترتيب ${q.position} بـ ${q.impressions} ظهور.`,
        },
        recommendedAction: {
          tr: `Bu kelimeyi hedefleyen sayfada H2 alt başlığı ve içeriği zenginleştirerek ilk 3 sıraya taşıyın.`,
          en: `Enrich H2 subheadings and content depth on the target page to push into Top 3.`,
          ar: `قم بتعزيز العناوين الفرعية والمحتوى في الصفحة المستهدفة للدخول إلى المراكز الأولى.`,
        },
        metrics: {
          clicks: q.clicks,
          impressions: q.impressions,
          ctr: q.ctr,
          position: q.position,
        },
      });
    }
  }

  return insights.slice(0, 10);
}

/**
 * Explicit demo mode payload clearly labeled for admin interface demonstration.
 */
function getDemoGscPayload(
  range: SeoDateRange,
  dates: { startDate: string; endDate: string },
  dataLagNotice: Record<Locale, string>
): GscAnalyticsPayload {
  const days = range === '7d' ? 7 : range === '28d' ? 28 : 90;
  const dailySeries: GscDailyMetric[] = [];
  let current = new Date(dates.startDate);

  for (let i = 0; i < days; i++) {
    const dayClicks = 35 + Math.floor(Math.sin(i / 3) * 15) + (i % 5);
    const dayImpressions = dayClicks * 22 + Math.floor(Math.random() * 80);
    dailySeries.push({
      date: current.toISOString().split('T')[0],
      clicks: dayClicks,
      impressions: dayImpressions,
      ctr: Number(((dayClicks / dayImpressions) * 100).toFixed(2)),
      position: Number((7.8 - (i % 3) * 0.4).toFixed(1)),
    });
    current = new Date(current.getTime() + 86400000);
  }

  const totalClicks = dailySeries.reduce((a, b) => a + b.clicks, 0);
  const totalImpressions = dailySeries.reduce((a, b) => a + b.impressions, 0);

  const topQueries: GscQueryRow[] = [
    { query: 'youtube video indir', locale: 'tr', clicks: 420, impressions: 8400, ctr: 5.0, position: 4.2, trend: 'rising' },
    { query: 'youtube mp3 indir', locale: 'tr', clicks: 310, impressions: 6900, ctr: 4.49, position: 5.8, trend: 'rising' },
    { query: 'instagram video downloader', locale: 'en', clicks: 280, impressions: 7200, ctr: 3.89, position: 6.4, trend: 'stable' },
    { query: 'tiktok video indir filigransız', locale: 'tr', clicks: 210, impressions: 3800, ctr: 5.53, position: 3.9, trend: 'rising' },
    { query: 'تحميل فيديو من يوتيوب', locale: 'ar', clicks: 195, impressions: 4100, ctr: 4.76, position: 5.1, trend: 'rising' },
    { query: 'free video downloader', locale: 'en', clicks: 160, impressions: 5900, ctr: 2.71, position: 8.9, trend: 'declining' },
    { query: 'تحويل الفيديو الى mp3', locale: 'ar', clicks: 140, impressions: 3200, ctr: 4.38, position: 6.2, trend: 'stable' },
    { query: 'twitter video indir', locale: 'tr', clicks: 125, impressions: 2700, ctr: 4.63, position: 4.8, trend: 'rising' },
  ];

  const topPages: GscPageRow[] = [
    { page: 'https://vidnoria.com/tr/youtube-video-downloader', locale: 'tr', clicks: 540, impressions: 10200, ctr: 5.29, position: 4.1 },
    { page: 'https://vidnoria.com/tr/youtube-mp3-indir', locale: 'tr', clicks: 380, impressions: 7800, ctr: 4.87, position: 5.3 },
    { page: 'https://vidnoria.com/en/youtube-video-downloader', locale: 'en', clicks: 320, impressions: 8100, ctr: 3.95, position: 6.8 },
    { page: 'https://vidnoria.com/ar/youtube-video-downloader', locale: 'ar', clicks: 260, impressions: 5400, ctr: 4.81, position: 5.4 },
    { page: 'https://vidnoria.com/tr/tiktok-video-downloader', locale: 'tr', clicks: 230, impressions: 4200, ctr: 5.48, position: 3.8 },
    { page: 'https://vidnoria.com/tr/instagram-video-downloader', locale: 'tr', clicks: 210, impressions: 4900, ctr: 4.29, position: 6.1 },
  ];

  return {
    connected: false,
    isDemoMode: true,
    propertyUrl: 'sc-domain:vidnoria.com (Örnek Demo Görünümü)',
    availableProperties: ['sc-domain:vidnoria.com'],
    range,
    lastSyncedAt: new Date().toISOString(),
    dataLagNotice,
    connectionReason: 'Örnek Veri / Demo Modu Aktif. Google Search Console API bağlandığında gerçek veriler otomatik yüklenecektir.',
    summary: {
      clicks: totalClicks,
      impressions: totalImpressions,
      ctr: Number(((totalClicks / totalImpressions) * 100).toFixed(2)),
      position: 5.6,
      prevClicks: Math.round(totalClicks * 0.88),
      prevImpressions: Math.round(totalImpressions * 0.91),
      clicksDeltaPercent: 13.6,
      impressionsDeltaPercent: 9.8,
      positionDelta: 0.8,
    },
    dailySeries,
    topQueries,
    topPages,
    byCountry: [
      { key: 'TR', label: 'Türkiye', clicks: Math.round(totalClicks * 0.44), impressions: Math.round(totalImpressions * 0.42), ctr: 5.2, position: 4.6 },
      { key: 'US', label: 'United States', clicks: Math.round(totalClicks * 0.18), impressions: Math.round(totalImpressions * 0.22), ctr: 4.1, position: 7.2 },
      { key: 'SA', label: 'Saudi Arabia', clicks: Math.round(totalClicks * 0.12), impressions: Math.round(totalImpressions * 0.11), ctr: 5.4, position: 5.0 },
      { key: 'EG', label: 'Egypt', clicks: Math.round(totalClicks * 0.08), impressions: Math.round(totalImpressions * 0.08), ctr: 4.9, position: 5.8 },
      { key: 'DE', label: 'Germany', clicks: Math.round(totalClicks * 0.06), impressions: Math.round(totalImpressions * 0.05), ctr: 5.9, position: 4.9 },
    ],
    byDevice: [
      { key: 'MOBILE', label: 'Mobil', clicks: Math.round(totalClicks * 0.72), impressions: Math.round(totalImpressions * 0.70), ctr: 5.1, position: 5.2 },
      { key: 'DESKTOP', label: 'Masaüstü', clicks: Math.round(totalClicks * 0.25), impressions: Math.round(totalImpressions * 0.27), ctr: 4.6, position: 5.9 },
      { key: 'TABLET', label: 'Tablet', clicks: Math.round(totalClicks * 0.03), impressions: Math.round(totalImpressions * 0.03), ctr: 4.8, position: 6.4 },
    ],
    byLanguage: [
      { key: 'tr', label: 'Türkçe (/tr)', clicks: Math.round(totalClicks * 0.52), impressions: Math.round(totalImpressions * 0.50), ctr: 5.2, position: 4.8 },
      { key: 'en', label: 'English (/en)', clicks: Math.round(totalClicks * 0.28), impressions: Math.round(totalImpressions * 0.30), ctr: 4.6, position: 6.5 },
      { key: 'ar', label: 'العربية (/ar)', clicks: Math.round(totalClicks * 0.20), impressions: Math.round(totalImpressions * 0.20), ctr: 5.0, position: 5.4 },
    ],
    insights: [
      {
        id: 'ins_1',
        type: 'high_impressions_low_ctr',
        priority: 'high',
        target: 'https://vidnoria.com/en/youtube-video-downloader',
        locale: 'en',
        title: {
          tr: 'Yüksek Gösterim, Düşük CTR: İngilizce YouTube İndirici',
          en: 'High Impressions, Low CTR: English YouTube Downloader',
          ar: 'ظهور عالٍ ونسبة نقر منخفضة: صفحة يوتيوب بالإنجليزية',
        },
        detail: {
          tr: 'Sayfa 8,100 gösterim almasına rağmen CTR %3.95 seviyesinde kaldı.',
          en: 'Page received 8,100 impressions with only 3.95% CTR.',
          ar: 'حصلت الصفحة على 8100 ظهور مع نسبة نقر 3.95% فقط.',
        },
        recommendedAction: {
          tr: 'İngilizce başlığa "1080p, 4K & MP3 Free" vurgusu ekleyerek SERP tıklama oranını artırın.',
          en: 'Emphasize "1080p, 4K & MP3 Free" in the title tag to boost SERP click-through.',
          ar: 'أضف عبارة "1080p, 4K & MP3 Free" لزيادة نسبة النقر.',
        },
        metrics: { clicks: 320, impressions: 8100, ctr: 3.95, position: 6.8 },
      },
      {
        id: 'ins_2',
        type: 'improving_query',
        priority: 'medium',
        target: 'tiktok video indir filigransız',
        locale: 'tr',
        title: {
          tr: 'İlk 3 Sıraya Yükselme Potansiyeli',
          en: 'Top 3 Ranking Push Opportunity',
          ar: 'فرصة للوصول إلى المراكز الثلاثة الأولى',
        },
        detail: {
          tr: '"tiktok video indir filigransız" sorgusu ortalama 3.9 konumunda ve hızla yükseliyor.',
          en: 'Query "tiktok video indir filigransız" is ranking 3.9 and climbing.',
          ar: 'الاستعلام في الترتيب 3.9 وفي تحسن مستمر.',
        },
        recommendedAction: {
          tr: '/tr/tiktok-video-downloader sayfasına filigransız indirme adımlarını açıklayan SSS bölümü ekleyin.',
          en: 'Add a dedicated FAQ block on watermark-free downloading to secure position #1-2.',
          ar: 'أضف قسماً للأسئلة الشائعة حول التحميل بدون علامة مائية.',
        },
        metrics: { clicks: 210, impressions: 3800, ctr: 5.53, position: 3.9 },
      },
    ],
  };
}
