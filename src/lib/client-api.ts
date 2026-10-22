import { MediaInfo, FormatOption, DownloadJob, Platform } from '@/types';

let cachedApiBase: string | null = null;

/**
 * Resolves the active backend API base URL.
 * 1. Tries same-origin `/api/health` (when running on a Node.js server).
 * 2. Tries live config from GitHub / `/api-config.json` (when frontend is hosted on GitHub Pages).
 */
export async function getApiBaseUrl(): Promise<string> {
  if (cachedApiBase !== null) return cachedApiBase;

  // 1. Check same-origin API first
  try {
    const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      cachedApiBase = '';
      return '';
    }
  } catch {
    // Same-origin API not available
  }

  // 2. Check remote dynamic api-config.json from GitHub repo (allows updating tunnel URL without rebuilding Pages)
  const configUrls = [
    `https://raw.githubusercontent.com/vess1710/vidnoria/main/public/api-config.json?t=${Date.now()}`,
    `/api-config.json?t=${Date.now()}`,
  ];

  for (const cfgUrl of configUrls) {
    try {
      const res = await fetch(cfgUrl, { cache: 'no-store' });
      if (res.ok) {
        const cfg = await res.json();
        if (cfg?.apiBaseUrl) {
          const cleanBase = cfg.apiBaseUrl.replace(/\/+$/, '');
          const healthRes = await fetch(`${cleanBase}/api/health`, { method: 'GET', cache: 'no-store' });
          if (healthRes.ok) {
            cachedApiBase = cleanBase;
            return cleanBase;
          }
        }
      }
    } catch {
      // Continue
    }
  }

  cachedApiBase = '';
  return '';
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
  const baseUrl = await getApiBaseUrl();

  try {
    const res = await fetch(`${baseUrl}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: targetUrl }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // Fallback to browser OEmbed analyzer
  }

  return fallbackBrowserAnalyze(targetUrl);
}

export async function startDownloadClient(
  mediaInfo: MediaInfo,
  selectedFormat: FormatOption
): Promise<{ success: boolean; job?: DownloadJob; error?: string; baseUrl?: string }> {
  const baseUrl = await getApiBaseUrl();

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
    // Ignore
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
