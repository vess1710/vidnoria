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
import crypto from 'crypto';
import { MediaInfo, FormatOption, Platform, VideoQuality } from '@/types';
import { AdapterError, ADAPTER_TIMEOUTS } from './base';
import { getYtDlpBinary, getFFmpegBinary } from '@/lib/media/processor';

const execFileAsync = promisify(execFile);

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
export async function fetchMediaInfo(url: string): Promise<YtDlpInfo> {
  const sanitized = sanitizeUrl(url);
  const ytdlpBin = getYtDlpBinary();

  try {
    const { stdout } = await execFileAsync(ytdlpBin, [
      '--dump-json',
      '--no-warnings',
      '--no-playlist',
      '--no-check-certificates',
      sanitized,
    ], {
      timeout: ADAPTER_TIMEOUTS.ANALYSIS,
      maxBuffer: 15 * 1024 * 1024, // 15MB buffer for large format lists
    });

    const info: YtDlpInfo = JSON.parse(stdout);
    return info;
  } catch (err: unknown) {
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

  await fs.mkdir(dir, { recursive: true });

  const fileId = crypto.randomUUID();
  const outputTemplate = path.join(dir, `${fileId}.%(ext)s`);
  const actualSelector = formatId.split('#')[0];

  try {
    const args = [
      '--no-warnings',
      '--no-playlist',
      '--no-check-certificates',
      '--ffmpeg-location', ffmpegBin,
      '-f', actualSelector,
      '--merge-output-format', 'mp4',
      '-o', outputTemplate,
      '--no-part',
      '--no-mtime',
      sanitized,
    ];

    await execFileAsync(ytdlpBin, args, {
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
  return {
    id: info.id,
    title: info.title || 'Untitled',
    thumbnail: getBestThumbnail(info),
    platform,
    duration: info.duration || 0,
    creator: info.uploader || info.channel || info.creator,
    url: info.webpage_url || '',
    availableFormats: parseFormats(info.formats || [], platform),
  };
}
