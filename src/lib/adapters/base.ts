// ============================================================================
// Vidnoria - Base Platform Adapter Interface
// ============================================================================

import { MediaInfo, FormatOption, Platform } from '@/types';

/**
 * Base interface that all platform adapters must implement.
 * Each adapter handles URL matching, media analysis, and download URL generation
 * for a specific platform (YouTube, Instagram, TikTok, etc.).
 */
export interface PlatformAdapter {
  /** Platform identifier */
  platform: Platform;

  /** Human-readable platform name */
  name: string;

  /**
   * Check if a given URL belongs to this platform.
   * @param url - The URL to check
   * @returns true if the URL matches this platform's patterns
   */
  matchUrl(url: string): boolean;

  /**
   * Analyze a URL and extract media information.
   * Uses yt-dlp under the hood to fetch metadata.
   * @param url - The media URL to analyze
   * @returns MediaInfo with title, thumbnail, duration, formats, etc.
   * @throws AdapterError on failure
   */
  analyze(url: string): Promise<MediaInfo>;

  /**
   * Get a download URL or temp file path for a specific format.
   * @param mediaInfo - Previously analyzed media info
   * @param format - The selected format/quality option
   * @returns Path to the downloaded temp file
   * @throws AdapterError on failure
   */
  getDownloadUrl(mediaInfo: MediaInfo, format: FormatOption): Promise<string>;
}

/**
 * Custom error class for adapter-specific errors.
 * Carries an error code that maps to user-facing messages.
 */
export class AdapterError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = 'AdapterError';
    this.code = code;
  }
}

/** Configuration for yt-dlp execution timeouts */
export const ADAPTER_TIMEOUTS = {
  /** Maximum time for analyzing/fetching metadata (ms) */
  ANALYSIS: 60_000,
  /** Maximum time for downloading media (ms) */
  DOWNLOAD: 300_000,
} as const;
