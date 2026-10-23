import { MediaInfo, FormatOption, DownloadJob, Platform, SiteSettings } from '@/types';

const DEFAULT_TUNNEL_URL = 'https://vidnoria.onrender.com';
let cachedApiBase: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 2 * 60 * 1000; // Re-verify every 2 minutes

/**
 * Resolves the active backend API base URL.
 * 1. Tries same-origin `/api/health` (when running on a Node.js server).
 * 2. Tries live config from GitHub (`raw.githubusercontent.com`) and `/api-config.json`.
 */
export async function getApiBaseUrl(forceRefresh = false): Promise<string> {
  if (!forceRefresh && cachedApiBase !== null && cachedApiBase !== '' && Date.now() - cachedAt < CACHE_TTL_MS) {
    return cachedApiBase;
  }

  if (!forceRefresh && typeof window !== 'undefined') {
    try {
      const saved = sessionStorage.getItem('vidnoria_api_base');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.url !== undefined && Date.now() - parsed.ts < CACHE_TTL_MS) {
          cachedApiBase = parsed.url;
          cachedAt = parsed.ts;
          return parsed.url;
        }
      }
    } catch {
      // ignore storage errors
    }
  }

  // 1. Check same-origin API first (skip on static GitHub Pages domain vidnoria.com to save a round-trip)
  if (typeof window !== 'undefined' && !window.location.hostname.endsWith('vidnoria.com') && !window.location.hostname.endsWith('github.io')) {
    try {
      const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        cachedApiBase = '';
        cachedAt = Date.now();
        try {
          sessionStorage.setItem('vidnoria_api_base', JSON.stringify({ url: '', ts: cachedAt }));
        } catch {}
        return '';
      }
    } catch {
      // Same-origin API not available
    }
  }

  // 2. Check remote dynamic api-config.json from GitHub repo (allows updating tunnel URL without rebuilding Pages)
  const configUrls = [
    `https://raw.githubusercontent.com/vess1710/vidnoria/main/public/api-config.json?t=${Date.now()}`,
    `/api-config.json?t=${Date.now()}`,
  ];

  const candidateBases: string[] = [];

  for (const cfgUrl of configUrls) {
    try {
      const res = await fetch(cfgUrl, { cache: 'no-store' });
      if (res.ok) {
        const cfg = await res.json();
        if (cfg?.apiBaseUrl) {
          const cleanBase = cfg.apiBaseUrl.replace(/\/+$/, '');
          if (cleanBase && !candidateBases.includes(cleanBase)) {
            candidateBases.push(cleanBase);
          }
        }
      }
    } catch {
      // Continue
    }
  }

  if (!candidateBases.includes(DEFAULT_TUNNEL_URL)) {
    candidateBases.push(DEFAULT_TUNNEL_URL);
  }

  for (const cleanBase of candidateBases) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const healthRes = await fetch(`${cleanBase}/api/health`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (healthRes.ok) {
        cachedApiBase = cleanBase;
        cachedAt = Date.now();
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('vidnoria_api_base', JSON.stringify({ url: cleanBase, ts: cachedAt }));
          } catch {}
        }
        return cleanBase;
      }
    } catch {
      // Try next candidate
    }
  }

  return candidateBases[0] || DEFAULT_TUNNEL_URL;
}

function detectPlatform(url: string): Platform | null {
  const u = url.toLowerCase();
  if (u.includes('youtube.com') || u.includes('youtu.be')) return 'youtube';
  if (u.includes('instagram.com')) return 'instagram';
  if (u.includes('tiktok.com')) return 'tiktok';
  if (u.includes('facebook.com') || u.includes('fb.watch')) return 'facebook';
  if (u.includes('twitter.com') || u.includes('x.com')) return 'twitter';
  return null;
}

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes('youtu.be')) {
      return parsed.pathname.slice(1).split('/')[0] || null;
    }
    if (parsed.searchParams.has('v')) {
      return parsed.searchParams.get('v');
    }
    const shortsMatch = parsed.pathname.match(/\/shorts\/([^/?]+)/);
    if (shortsMatch) return shortsMatch[1];
  } catch {
    // ignore
  }
  return null;
}

/**
 * Client-side fallback analyzer using OEmbed (Noembed) when backend server is unreachable
 */
async function fallbackBrowserAnalyze(targetUrl: string): Promise<{ success: boolean; data?: MediaInfo; error?: any }> {
  const platform = detectPlatform(targetUrl);
  if (!platform) {
    return {
      success: false,
      error: { code: 'UNSUPPORTED_PLATFORM', message: 'Desteklenmeyen platform.' },
    };
  }

  let title = `${platform.toUpperCase()} Medya Dosyası`;
  let creator = platform.toUpperCase();
  let thumbnail = '';
  const ytId = extractYouTubeId(targetUrl);

  try {
    const oembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`);
    if (oembedRes.ok) {
      const oembed = await oembedRes.json();
      if (oembed.title) title = oembed.title;
      if (oembed.author_name) creator = oembed.author_name;
      if (oembed.thumbnail_url) thumbnail = oembed.thumbnail_url;
    }
  } catch {
    // Use fallback values
  }

  if (!thumbnail && ytId) {
    thumbnail = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
  }

  const availableFormats: FormatOption[] = [
    {
      formatId: 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[height<=1080][ext=mp4]/best#1080p',
      type: 'video',
      format: 'mp4',
      quality: '1080p',
      label: '1080p Full HD',
    },
    {
      formatId: 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[height<=720][ext=mp4]/best#720p',
      type: 'video',
      format: 'mp4',
      quality: '720p',
      label: '720p HD',
    },
    {
      formatId: 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[height<=480][ext=mp4]/best#480p',
      type: 'video',
      format: 'mp4',
      quality: '480p',
      label: '480p SD',
    },
    {
      formatId: 'bestvideo[height<=360][ext=mp4]+bestaudio[ext=m4a]/best[height<=360][ext=mp4]/best#360p',
      type: 'video',
      format: 'mp4',
      quality: '360p',
      label: '360p Normal',
    },
    {
      formatId: 'bestaudio/best#mp3-320',
      type: 'audio',
      format: 'mp3',
      bitrate: '320',
      label: 'MP3 320kbps',
    },
    {
      formatId: 'bestaudio/best#mp3-192',
      type: 'audio',
      format: 'mp3',
      bitrate: '192',
      label: 'MP3 192kbps',
    },
  ];

  return {
    success: true,
    data: {
      id: ytId || Date.now().toString(36),
      title,
      thumbnail,
      platform,
      duration: 0,
      creator,
      url: targetUrl,
      availableFormats,
    },
  };
}

export async function analyzeUrlClient(targetUrl: string): Promise<{ success: boolean; data?: MediaInfo; error?: any }> {
  const cacheKey = `vidnoria_analyze:${targetUrl.trim()}`;
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.data && Date.now() - parsed.ts < 5 * 60 * 1000) {
          return { success: true, data: parsed.data };
        }
      }
    } catch {}
  }

  const baseUrl = await getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await res.json();
      if (json.success && json.data) {
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ data: json.data, ts: Date.now() }));
          } catch {}
        }
        return json;
      }
      // If datacenter backend returned a bot-block / processing error, fall back to browser OEmbed analyzer
      if (json.error?.code !== 'INVALID_URL' && json.error?.code !== 'UNSUPPORTED_PLATFORM') {
        const fallback = await fallbackBrowserAnalyze(targetUrl);
        if (fallback.success) return fallback;
      }
      return json;
    }
  } catch {
    // Fallback to browser OEmbed analyzer
  }

  // The backend could not be reached. The browser fallback only provides basic
  // metadata; actual downloading still requires the media server.
  return fallbackBrowserAnalyze(targetUrl);
}

export async function startDownloadClient(
  mediaInfo: MediaInfo,
  selectedFormat: FormatOption
): Promise<{ success: boolean; job?: DownloadJob; error?: string; baseUrl?: string }> {
  for (const force of [false, true]) {
    const baseUrl = await getApiBaseUrl(force);
    try {
      const res = await fetch(`${baseUrl}/api/download`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mediaInfo,
          format: selectedFormat,
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.job?.downloadUrl && baseUrl && data.job.downloadUrl.startsWith('/')) {
          data.job.downloadUrl = `${baseUrl}${data.job.downloadUrl}`;
        }
        return { ...data, baseUrl };
      }
    } catch {
      cachedApiBase = null;
    }
  }

  return {
    success: false,
    error: 'Medya işleme sunucusuna bağlanılamadı.',
  };
}

export async function pollJobStatusClient(jobId: string): Promise<{ success: boolean; job?: DownloadJob }> {
  const baseUrl = await getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/download/${jobId}`);
  const data = await res.json();
  if (data.job?.downloadUrl && baseUrl && data.job.downloadUrl.startsWith('/')) {
    data.job.downloadUrl = `${baseUrl}${data.job.downloadUrl}`;
  }
  return data;
}


/**
 * Upload a local file to the media server and convert it with FFmpeg.
 * Throws an Error with a user-readable message when the server is unreachable or fails.
 */
export async function convertFileClient(file: Blob, filename: string, format: string, bitrate = '192'): Promise<Blob> {
  let lastError = 'Medya işleme sunucusuna bağlanılamadı.';

  for (const force of [false, true]) {
    const baseUrl = await getApiBaseUrl(force);
    try {
      const form = new FormData();
      form.append('file', file, filename);
      form.append('format', format);
      form.append('bitrate', bitrate);

      const res = await fetch(`${baseUrl}/api/convert`, { method: 'POST', body: form });
      if (res.ok) {
        return await res.blob();
      }
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => null);
        if (data?.error) lastError = data.error;
        // Server answered with an application error — retrying won't help
        break;
      }
    } catch {
      cachedApiBase = null;
    }
  }

  throw new Error(lastError);
}

let cachedPublicSettings: SiteSettings | null = null;
let publicSettingsPromise: Promise<SiteSettings | null> | null = null;

/**
 * Returns site settings for the current visitor.
 * Admin preview values in localStorage win; otherwise the public settings
 * configured through the admin panel are fetched from the media server.
 */
export async function getSiteSettingsClient(): Promise<SiteSettings | null> {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('vidnoria_settings') : null;
    if (raw) return JSON.parse(raw) as SiteSettings;
  } catch {
    // ignore malformed local settings
  }

  if (cachedPublicSettings) return cachedPublicSettings;
  if (!publicSettingsPromise) {
    publicSettingsPromise = (async () => {
      try {
        const baseUrl = await getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/settings`, { cache: 'no-store' });
        if (!res.ok || !(res.headers.get('content-type') || '').includes('application/json')) return null;
        const data = await res.json();
        cachedPublicSettings = data?.success ? (data.settings as SiteSettings) : null;
        return cachedPublicSettings;
      } catch {
        return null;
      } finally {
        publicSettingsPromise = null;
      }
    })();
  }
  return publicSettingsPromise;
}
