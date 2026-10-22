import type { PlatformAdapter } from './base';
import type { MediaInfo, FormatOption } from '@/types';
import { fetchMediaInfo, buildMediaInfo, downloadMedia } from './yt-dlp';

const URL_PATTERNS = [
  /^https?:\/\/(www\.)?facebook\.com\/[\w.-]+\/videos\/\d+/i,
  /^https?:\/\/(www\.)?facebook\.com\/watch\/?\?v=\d+/i,
  /^https?:\/\/fb\.watch\/[\w-]+/i,
  /^https?:\/\/(www\.)?facebook\.com\/reel\/\d+/i,
];

export class FacebookAdapter implements PlatformAdapter {
  platform = 'facebook' as const;
  name = 'Facebook';

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
