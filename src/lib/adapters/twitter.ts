import type { PlatformAdapter } from './base';
import type { MediaInfo, FormatOption } from '@/types';
import { fetchMediaInfo, buildMediaInfo, downloadMedia } from './yt-dlp';

const URL_PATTERNS = [
  /^https?:\/\/(www\.)?twitter\.com\/[\w]+\/status\/\d+/i,
  /^https?:\/\/(www\.)?x\.com\/[\w]+\/status\/\d+/i,
];

export class TwitterAdapter implements PlatformAdapter {
  platform = 'twitter' as const;
  name = 'Twitter / X';

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
