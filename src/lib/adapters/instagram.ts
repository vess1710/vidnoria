import type { PlatformAdapter } from './base';
import type { MediaInfo, FormatOption } from '@/types';
import { fetchMediaInfo, buildMediaInfo, downloadMedia } from './yt-dlp';

const URL_PATTERNS = [
  /^https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+/i,
  /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+/i,
  /^https?:\/\/(www\.)?instagram\.com\/tv\/[\w-]+/i,
];

export class InstagramAdapter implements PlatformAdapter {
  platform = 'instagram' as const;
  name = 'Instagram';

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
