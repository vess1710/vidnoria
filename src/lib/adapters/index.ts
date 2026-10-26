// ============================================================================
// Vidnoria - Platform Adapters Index
// ============================================================================

import type { PlatformAdapter } from './base';
import type { Platform } from '@/types';
import { YouTubeAdapter } from './youtube';
import { InstagramAdapter } from './instagram';
import { TikTokAdapter } from './tiktok';
import { FacebookAdapter } from './facebook';
import { TwitterAdapter } from './twitter';
import { PinterestAdapter } from './pinterest';
import { RedditAdapter } from './reddit';
import { ThreadsAdapter } from './threads';
import { CapCutAdapter } from './capcut';
import { SnapchatAdapter } from './snapchat';

/** All registered platform adapters */
const adapters: PlatformAdapter[] = [
  new YouTubeAdapter(),
  new InstagramAdapter(),
  new TikTokAdapter(),
  new FacebookAdapter(),
  new TwitterAdapter(),
  new PinterestAdapter(),
  new RedditAdapter(),
  new ThreadsAdapter(),
  new CapCutAdapter(),
  new SnapchatAdapter(),
];

/**
 * Find the matching adapter for a URL.
 */
export function getAdapterForUrl(url: string): PlatformAdapter | null {
  for (const adapter of adapters) {
    if (adapter.matchUrl(url)) {
      return adapter;
    }
  }
  return null;
}

/**
 * Get an adapter by platform ID.
 */
export function getAdapterByPlatform(platform: Platform): PlatformAdapter | null {
  return adapters.find(a => a.platform === platform) || null;
}

/**
 * Get all registered adapters.
 */
export function getAllAdapters(): PlatformAdapter[] {
  return [...adapters];
}

export { type PlatformAdapter, AdapterError } from './base';
