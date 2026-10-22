// ============================================================================
// Vidnoria - Core TypeScript Types
// ============================================================================

// ---------------------------------------------------------------------------
// Platform Types
// ---------------------------------------------------------------------------

/** Supported download platforms */
export type Platform = 'youtube' | 'instagram' | 'tiktok' | 'facebook' | 'twitter';

/** Configuration for a supported platform */
export interface PlatformConfig {
  id: Platform;
  name: string;
  icon: string;
  enabled: boolean;
  supportedFormats: MediaFormat[];
  urlPatterns: RegExp[];
}

// ---------------------------------------------------------------------------
// Media Types
// ---------------------------------------------------------------------------

export type VideoFormat = 'mp4' | 'webm';
export type AudioFormat = 'mp3' | 'm4a' | 'aac' | 'wav' | 'flac';
export type MediaFormat = VideoFormat | AudioFormat;
export type VideoQuality = '360p' | '480p' | '720p' | '1080p' | '1440p' | '4k';
export type AudioBitrate = '128' | '192' | '256' | '320';

/** Information about a media item retrieved from a platform */
export interface MediaInfo {
  id: string;
  title: string;
  thumbnail: string;
  platform: Platform;
  /** Duration in seconds */
  duration: number;
  creator?: string;
  url: string;
  availableFormats: FormatOption[];
  embedUrl?: string;
}

/** A selectable format/quality option for download */
export interface FormatOption {
  formatId: string;
  type: 'video' | 'audio';
  format: MediaFormat;
  quality?: VideoQuality;
  bitrate?: AudioBitrate;
  /** File size in bytes */
  fileSize?: number;
  label: string;
}

// ---------------------------------------------------------------------------
// Download Job Types
// ---------------------------------------------------------------------------

/** Represents a queued or in-progress download job */
export interface DownloadJob {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  /** Progress percentage (0-100) */
  progress: number;
  mediaInfo: MediaInfo;
  selectedFormat: FormatOption;
  createdAt: number;
  completedAt?: number;
  error?: string;
  downloadUrl?: string;
  expiresAt?: number;
}

// ---------------------------------------------------------------------------
// Analysis Types
// ---------------------------------------------------------------------------

export interface AnalysisRequest {
  url: string;
}

export interface AnalysisResponse {
  success: boolean;
  data?: MediaInfo;
  error?: AnalysisError;
}

export interface AnalysisError {
  code: ErrorCode;
  message: string;
}

export type ErrorCode =
  | 'INVALID_URL'
  | 'UNSUPPORTED_PLATFORM'
  | 'DELETED_CONTENT'
  | 'PRIVATE_CONTENT'
  | 'ACCESS_DENIED'
  | 'REGION_RESTRICTED'
  | 'DRM_PROTECTED'
  | 'PROCESSING_ERROR'
  | 'CAPACITY_LIMIT'
  | 'RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'TIMEOUT'
  | 'UNKNOWN';

// ---------------------------------------------------------------------------
// Site Settings Types
// ---------------------------------------------------------------------------

export interface SiteSettings {
  siteName: string;
  siteDescription: Record<string, string>;
  logo: string;
  favicon: string;
  contactEmail: string;
  socialLinks: {
    twitter?: string;
    github?: string;
    instagram?: string;
  };
  seo: {
    defaultTitle: Record<string, string>;
    defaultDescription: Record<string, string>;
    googleAnalyticsId?: string;
    googleTagManagerId?: string;
    googleSearchConsoleId?: string;
    bingWebmasterToolsId?: string;
  };
  ads: {
    enabled: boolean;
    adsensePublisherId?: string;
    slots: AdSlot[];
  };
  platforms: Record<Platform, PlatformStatus>;
}

export interface PlatformStatus {
  enabled: boolean;
  errorRate?: number;
  lastChecked?: number;
}

export interface AdSlot {
  id: string;
  name: string;
  position: 'header' | 'content' | 'sidebar' | 'download' | 'blog' | 'footer';
  slotId: string;
  format: 'auto' | 'rectangle' | 'horizontal' | 'vertical';
  enabled: boolean;
}

// ---------------------------------------------------------------------------
// Blog Types
// ---------------------------------------------------------------------------

export interface BlogPost {
  slug: string;
  title: Record<string, string>;
  description: Record<string, string>;
  content: Record<string, string>;
  category: string;
  coverImage?: string;
  publishedAt?: string;
  updatedAt?: string;
  status: 'draft' | 'published';
  readingTime: Record<string, number>;
  seoTitle?: Record<string, string>;
  seoDescription?: Record<string, string>;
  tags?: string[];
}

export interface BlogCategory {
  id: string;
  name: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Admin Types
// ---------------------------------------------------------------------------

export interface AdminSession {
  authenticated: boolean;
  expiresAt: number;
}

// ---------------------------------------------------------------------------
// Theme
// ---------------------------------------------------------------------------

export type Theme = 'light' | 'dark' | 'system';
