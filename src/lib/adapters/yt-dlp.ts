// ============================================================================
// Vidnoria - yt-dlp Helper Utilities
// ============================================================================
// Shared utilities for all adapters that use yt-dlp as the backend tool.
// All child_process calls use execFile with array args to prevent injection.
// ============================================================================

import { execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import fsSync from 'fs';
import crypto from 'crypto';
import { MediaInfo, FormatOption, Platform, VideoQuality, CarouselItem } from '@/types';
import { AdapterError, ADAPTER_TIMEOUTS } from './base';
import { getYtDlpBinary, getFFmpegBinary } from '@/lib/media/processor';

const execFileAsync = promisify(execFile);

/**
 * Returns ['--cookies', path] if a valid Netscape cookies.txt is configured
 * via YOUTUBE_COOKIES env var or content/settings/cookies.txt.
 */
function getCookieArgs(): string[] {
  try {
    if (process.env.YOUTUBE_COOKIES && process.env.YOUTUBE_COOKIES.trim().length > 20) {
      const envCookiePath = path.join(/*turbopackIgnore: true*/ os.tmpdir(), 'vidnoria', 'yt-cookies.txt');
      fsSync.mkdirSync(path.dirname(envCookiePath), { recursive: true });
      fsSync.writeFileSync(envCookiePath, process.env.YOUTUBE_COOKIES, 'utf8');
      return ['--cookies', envCookiePath];
    }
    const localCookiePath = path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'settings', 'cookies.txt');
    if (fsSync.existsSync(localCookiePath)) {
      const content = fsSync.readFileSync(localCookiePath, 'utf8');
      const hasCookieLines = content
        .split(/\r?\n/)
        .some(line => line.trim() && !line.trim().startsWith('#') && line.includes('\t'));
      if (hasCookieLines) {
        return ['--cookies', localCookiePath];
      }
    }
  } catch {
    // ignore cookie read errors
  }
  return [];
}

/**
 * Fallback downloader via public Piped / Invidious APIs when a datacenter IP
 * (such as Render) hits YouTube's bot check without cookies.
 */
async function fallbackPublicStreamDownload(
  url: string,
  isAudioOnly: boolean,
  dir: string,
  fileId: string
): Promise<string | null> {
  const ytIdMatch = url.match(/(?:v=|youtu\.be\/|\/shorts\/)([\w-]{11})/);
  if (!ytIdMatch) return null;
  const videoId = ytIdMatch[1];

  const pipedApis = [
    `https://pipedapi.kavin.rocks/streams/${videoId}`,
    `https://pipedapi.tokhmi.xyz/streams/${videoId}`,
    `https://pipedapi.moomoo.me/streams/${videoId}`,
  ];

  for (const apiUrl of pipedApis) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      const streams = isAudioOnly ? data.audioStreams : data.videoStreams?.filter((s: any) => !s.videoOnly);
      const streamUrl = streams?.[0]?.url || data.videoStreams?.[0]?.url;
      if (streamUrl) {
        const ext = isAudioOnly ? 'm4a' : 'mp4';
        const outPath = path.join(/*turbopackIgnore: true*/ dir, `${fileId}.${ext}`);
        const mediaRes = await fetch(streamUrl);
        if (mediaRes.ok) {
          const buf = Buffer.from(await mediaRes.arrayBuffer());
          if (buf.byteLength > 1000) {
            await fs.writeFile(outPath, buf);
            return outPath;
          }
        }
      }
    } catch {
      // try next mirror
    }
  }

  const invidiousApis = [
    `https://inv.nadeko.net/api/v1/videos/${videoId}`,
    `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
  ];

  for (const apiUrl of invidiousApis) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(apiUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      const streamUrl = isAudioOnly
        ? data.adaptiveFormats?.find((f: any) => f.type?.startsWith('audio/'))?.url
        : data.formatStreams?.[0]?.url;
      if (streamUrl) {
        const ext = isAudioOnly ? 'm4a' : 'mp4';
        const outPath = path.join(/*turbopackIgnore: true*/ dir, `${fileId}.${ext}`);
        const mediaRes = await fetch(streamUrl);
        if (mediaRes.ok) {
          const buf = Buffer.from(await mediaRes.arrayBuffer());
          if (buf.byteLength > 1000) {
            await fs.writeFile(outPath, buf);
            return outPath;
          }
        }
      }
    } catch {
      // try next mirror
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// URL Sanitization
// ---------------------------------------------------------------------------

/** Characters allowed in URLs - reject anything suspicious */
const SAFE_URL_PATTERN = /^https?:\/\/[^\s<>"{}|\\^`[\]]+$/;

/**
 * Sanitize and validate a URL before passing to yt-dlp.
 * Prevents command injection and SSRF via malformed URLs.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();

  if (!SAFE_URL_PATTERN.test(trimmed)) {
    throw new AdapterError('Invalid URL format', 'INVALID_URL');
  }

  // Block private/internal IPs (SSRF protection)
  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.toLowerCase();

    const blockedPatterns = [
      /^localhost$/i,
      /^127\./,
      /^10\./,
      /^172\.(1[6-9]|2\d|3[01])\./,
      /^192\.168\./,
      /^0\./,
      /^169\.254\./,
      /^\[::1\]$/,
      /^\[fc/i,
      /^\[fd/i,
      /^\[fe80/i,
    ];

    for (const pattern of blockedPatterns) {
      if (pattern.test(hostname)) {
        throw new AdapterError('Access to internal networks is not allowed', 'ACCESS_DENIED');
      }
    }
  } catch (err) {
    if (err instanceof AdapterError) throw err;
    throw new AdapterError('Invalid URL', 'INVALID_URL');
  }

  return trimmed;
}

// ---------------------------------------------------------------------------
// yt-dlp JSON Output Types
// ---------------------------------------------------------------------------

export interface YtDlpInfo {
  id: string;
  title: string;
  thumbnail?: string;
  thumbnails?: Array<{ url: string; width?: number; height?: number }>;
  duration?: number;
  uploader?: string;
  channel?: string;
  creator?: string;
  webpage_url: string;
  formats?: YtDlpFormat[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface YtDlpFormat {
  format_id: string;
  ext: string;
  width?: number;
  height?: number;
  vcodec?: string;
  acodec?: string;
  filesize?: number;
  filesize_approx?: number;
  tbr?: number;
  abr?: number;
  format_note?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// yt-dlp Execution
// ---------------------------------------------------------------------------

/**
 * Run yt-dlp --dump-json to fetch metadata for a URL.
 * Uses execFile with array arguments (never shell:true).
 */
export async function fetchMediaInfo(url: string, allowCarousel: boolean = false): Promise<YtDlpInfo> {
  const sanitized = sanitizeUrl(url);
  const ytdlpBin = getYtDlpBinary();
  const cookieArgs = getCookieArgs();

  try {
    const args = [
      allowCarousel ? '--dump-single-json' : '--dump-json',
      '--js-runtimes', 'node',
      ...cookieArgs,
      ...(allowCarousel ? [] : ['--no-playlist']),
      '--no-warnings',
      '--no-check-certificates',
      sanitized,
    ];

    const { stdout } = await execFileAsync(ytdlpBin, args, {
      timeout: ADAPTER_TIMEOUTS.ANALYSIS,
      maxBuffer: 25 * 1024 * 1024, // 25MB buffer for large format / carousel lists
    });

    const info: YtDlpInfo = JSON.parse(stdout);
    return info;
  } catch (err: unknown) {
    // If datacenter IP is blocked by YouTube bot-check, fallback to public OEmbed metadata
    try {
      const oembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(sanitized)}`);
      if (oembedRes.ok) {
        const oembed = await oembedRes.json();
        if (oembed && oembed.title) {
          const ytIdMatch = sanitized.match(/(?:v=|youtu\.be\/|\/shorts\/)([\w-]{11})/);
          const id = ytIdMatch ? ytIdMatch[1] : crypto.randomUUID().slice(0, 11);
          return {
            id,
            title: oembed.title,
            thumbnail: oembed.thumbnail_url || (ytIdMatch ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : ''),
            duration: 0,
            uploader: oembed.author_name || '',
            webpage_url: sanitized,
            formats: [
              { format_id: '137', ext: 'mp4', height: 1080, vcodec: 'avc1' },
              { format_id: '22', ext: 'mp4', height: 720, vcodec: 'avc1' },
              { format_id: '18', ext: 'mp4', height: 360, vcodec: 'avc1' },
            ],
          };
        }
      }
    } catch {
      // Proceed to standard error mapping
    }
    const error = err as { killed?: boolean; code?: string; stderr?: string; message?: string };

    if (error.killed) {
      throw new AdapterError('Analysis timed out', 'TIMEOUT');
    }

    const stderr = error.stderr || error.message || '';
    console.error('[yt-dlp error]', stderr);

    if (stderr.includes('Private video') || stderr.includes('is private')) {
      throw new AdapterError('This content is private', 'PRIVATE_CONTENT');
    }
    if (stderr.includes('Video unavailable') || stderr.includes('has been removed')) {
      throw new AdapterError('This content has been deleted or is unavailable', 'DELETED_CONTENT');
    }
    if (stderr.includes('Sign in') || stderr.includes('login') || stderr.includes('authentication')) {
      throw new AdapterError('This content requires authentication', 'ACCESS_DENIED');
    }
    if (stderr.includes('geo') || stderr.includes('not available in your country')) {
      throw new AdapterError('This content is region-restricted', 'REGION_RESTRICTED');
    }
    if (stderr.includes('DRM') || stderr.includes('protected')) {
      throw new AdapterError('This content is DRM-protected', 'DRM_PROTECTED');
    }
    if (stderr.includes('Unsupported URL') || stderr.includes('is not a valid URL')) {
      throw new AdapterError('Unsupported or invalid URL', 'UNSUPPORTED_PLATFORM');
    }

    throw new AdapterError(
      `Failed to analyze URL: ${stderr.slice(0, 200)}`,
      'PROCESSING_ERROR'
    );
  }
}

/**
 * Download media using yt-dlp to a temp file.
 * Returns the path to the downloaded file.
 */
export async function downloadMedia(
  url: string,
  formatId: string,
  outputDir?: string
): Promise<string> {
  const sanitized = sanitizeUrl(url);
  const dir = outputDir || path.join(os.tmpdir(), 'vidnoria');
  const ytdlpBin = getYtDlpBinary();
  const ffmpegBin = getFFmpegBinary();
  const cookieArgs = getCookieArgs();

  await fs.mkdir(dir, { recursive: true });

  const fileId = crypto.randomUUID();
  const outputTemplate = path.join(dir, `${fileId}.%(ext)s`);
  const actualSelector = formatId.split('#')[0];

  // Audio-only selectors must not be forced into an mp4 container
  const isAudioOnly = actualSelector.startsWith('bestaudio');

  const baseArgs = [
    '--js-runtimes', 'node',
    ...cookieArgs,
    '--concurrent-fragments', '4',
    '--no-playlist',
    '--no-warnings',
    '--no-check-certificates',
    '--ffmpeg-location', ffmpegBin,
    '-f', actualSelector,
    ...(isAudioOnly ? [] : ['--merge-output-format', 'mp4']),
    '-o', outputTemplate,
    '--no-part',
    '--no-mtime',
    sanitized,
  ];

  try {
    await execFileAsync(ytdlpBin, baseArgs, {
      timeout: ADAPTER_TIMEOUTS.DOWNLOAD,
      maxBuffer: 10 * 1024 * 1024,
    });

    const files = await fs.readdir(/*turbopackIgnore: true*/ dir);
    const downloaded = files.find(f => f.startsWith(fileId));

    if (!downloaded) {
      throw new AdapterError('Download completed but file not found', 'PROCESSING_ERROR');
    }

    return path.join(dir, downloaded);
  } catch (err: unknown) {
    // Retry 1: Alternate embedded/VR YouTube clients (bypasses many datacenter bot checks)
    try {
      await execFileAsync(
        ytdlpBin,
        ['--extractor-args', 'youtube:player_client=android_vr,tv_embedded,mweb,ios', ...baseArgs],
        {
          timeout: ADAPTER_TIMEOUTS.DOWNLOAD,
          maxBuffer: 10 * 1024 * 1024,
        }
      );
      const files = await fs.readdir(/*turbopackIgnore: true*/ dir);
      const downloaded = files.find(f => f.startsWith(fileId));
      if (downloaded) {
        return path.join(dir, downloaded);
      }
    } catch {
      // Proceed to public mirror fallback
    }

    // Retry 2: Public Piped / Invidious stream mirrors when datacenter IP is blocked
    const mirrorPath = await fallbackPublicStreamDownload(sanitized, isAudioOnly, dir, fileId);
    if (mirrorPath) {
      return mirrorPath;
    }

    if (err instanceof AdapterError) throw err;

    const error = err as { killed?: boolean; stderr?: string; message?: string };

    if (error.killed) {
      throw new AdapterError('Download timed out', 'TIMEOUT');
    }

    throw new AdapterError(
      `Download failed: ${(error.stderr || error.message || '').slice(0, 200)}`,
      'PROCESSING_ERROR'
    );
  }
}

// ---------------------------------------------------------------------------
// Format Mapping Helpers
// ---------------------------------------------------------------------------

export function heightToQuality(height: number): VideoQuality | null {
  if (height >= 2160) return '4k';
  if (height >= 1440) return '1440p';
  if (height >= 1080) return '1080p';
  if (height >= 720) return '720p';
  if (height >= 480) return '480p';
  if (height >= 360) return '360p';
  return null;
}

const QUALITY_TO_HEIGHT: Record<VideoQuality, number> = {
  '4k': 2160,
  '1440p': 1440,
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
  '360p': 360,
};

/**
 * Parse yt-dlp format list into our FormatOption array.
 * Supports both progressive and DASH (video+audio merged via FFmpeg) formats.
 */
export function parseFormats(formats: YtDlpFormat[], _platform: Platform): FormatOption[] {
  const result: FormatOption[] = [];
  const availableQualities = new Set<VideoQuality>();

  // Discover all available video resolutions in the source
  for (const fmt of formats) {
    const hasVideo = fmt.vcodec && fmt.vcodec !== 'none';
    if (hasVideo && fmt.height) {
      const q = heightToQuality(fmt.height);
      if (q) availableQualities.add(q);
    }
  }

  // Order qualities from highest to lowest
  const orderedQualities: VideoQuality[] = ['4k', '1440p', '1080p', '720p', '480p', '360p'];
  for (const q of orderedQualities) {
    if (availableQualities.has(q)) {
      const maxH = QUALITY_TO_HEIGHT[q];
      result.push({
        formatId: `bestvideo[height<=${maxH}][ext=mp4]+bestaudio[ext=m4a]/best[height<=${maxH}][ext=mp4]/best[height<=${maxH}]/best`,
        type: 'video',
        format: 'mp4',
        quality: q,
        label: `${q.toUpperCase()} MP4`,
      });
    }
  }

  // Fallback if no specific video heights were reported (e.g. direct social clip)
  if (!result.some(f => f.type === 'video')) {
    result.push({
      formatId: 'bestvideo+bestaudio/best',
      type: 'video',
      format: 'mp4',
      quality: '720p',
      label: 'HD MP4 (Orijinal Kalite)',
    });
  }

  // Standard Audio options (converted via FFmpeg in job-manager)
  result.push(
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
    {
      formatId: 'bestaudio[ext=m4a]/bestaudio/best#m4a-192',
      type: 'audio',
      format: 'm4a',
      bitrate: '192',
      label: 'M4A 192kbps',
    }
  );

  return result;
}

export function getBestThumbnail(info: YtDlpInfo): string {
  if (info.thumbnail) return info.thumbnail;

  if (info.thumbnails && info.thumbnails.length > 0) {
    const sorted = [...info.thumbnails].sort(
      (a, b) => (b.width || 0) - (a.width || 0)
    );
    return sorted[0].url;
  }

  return '';
}

export function buildMediaInfo(info: YtDlpInfo, platform: Platform): MediaInfo {
  let isCarousel = false;
  let carouselItems: CarouselItem[] | undefined = undefined;

  const entries = info.entries || (Array.isArray(info) ? info : null);
  if (entries && Array.isArray(entries) && entries.length > 1) {
    isCarousel = true;
    carouselItems = entries.map((entry: any, idx: number) => {
      const isVideo =
        (entry.vcodec && entry.vcodec !== 'none') ||
        entry.ext === 'mp4' ||
        (entry.formats && entry.formats.some((f: any) => f.vcodec && f.vcodec !== 'none'));

      let downloadUrl = entry.url;
      if (!downloadUrl && entry.formats && entry.formats.length > 0) {
        const sorted = [...entry.formats].sort((a: any, b: any) => (b.height || 0) - (a.height || 0));
        downloadUrl = sorted[0].url;
      }
      if (!downloadUrl) {
        downloadUrl = getBestThumbnail(entry) || entry.thumbnail;
      }

      return {
        id: entry.id || `${info.id || 'slide'}_${idx + 1}`,
        index: idx + 1,
        type: isVideo ? 'video' : 'image',
        url: downloadUrl || '',
        thumbnail: getBestThumbnail(entry) || entry.thumbnail || downloadUrl || '',
        format: isVideo ? 'mp4' : 'jpg',
        quality: entry.height ? `${entry.height}p` : (isVideo ? 'HD MP4' : 'Orijinal JPG'),
        width: entry.width,
        height: entry.height,
        title: entry.title || `Slayt #${idx + 1}`,
      };
    });
  }

  const primaryItem = (entries && entries.length > 0) ? entries[0] : info;

  return {
    id: info.id || primaryItem.id || 'media',
    title: info.title || primaryItem.title || 'Untitled',
    thumbnail: getBestThumbnail(primaryItem) || getBestThumbnail(info),
    platform,
    duration: info.duration || primaryItem.duration || 0,
    creator: info.uploader || info.channel || info.creator || primaryItem.uploader,
    url: info.webpage_url || primaryItem.webpage_url || '',
    availableFormats: parseFormats((primaryItem.formats || info.formats) || [], platform),
    isCarousel,
    carouselItems,
  };
}
