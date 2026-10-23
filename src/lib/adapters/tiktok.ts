import type { PlatformAdapter } from './base';
import type { MediaInfo, FormatOption } from '@/types';
import { PLATFORM_PATTERNS } from '@/lib/security';
import { fetchMediaInfo, buildMediaInfo, downloadMedia } from './yt-dlp';

const URL_PATTERNS = PLATFORM_PATTERNS.tiktok;

export class TikTokAdapter implements PlatformAdapter {
  platform = 'tiktok' as const;
  name = 'TikTok';

  matchUrl(url: string): boolean {
    return URL_PATTERNS.some(p => p.test(url.trim()));
  }

  async analyze(url: string): Promise<MediaInfo> {
    const info = await fetchMediaInfo(url);
    return buildMediaInfo(info, this.platform);
  }

  async getDownloadUrl(mediaInfo: MediaInfo, format: FormatOption): Promise<string> {
    return downloadMedia(mediaInfo.url, format.formatId);
  }
}
