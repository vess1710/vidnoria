import type { PlatformAdapter } from './base';
import type { MediaInfo, FormatOption } from '@/types';
import { fetchMediaInfo, buildMediaInfo, downloadMedia } from './yt-dlp';

const URL_PATTERNS = [
  /^https?:\/\/(www\.|m\.|music\.)?youtube\.com\/watch\?.*v=[\w-]+/i,
  /^https?:\/\/youtu\.be\/[\w-]+/i,
  /^https?:\/\/(www\.|m\.)?youtube\.com\/shorts\/[\w-]+/i,
  /^https?:\/\/(www\.|m\.)?youtube\.com\/live\/[\w-]+/i,
  /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/i,
];

export class YouTubeAdapter implements PlatformAdapter {
  platform = 'youtube' as const;
  name = 'YouTube';

  matchUrl(url: string): boolean {
    return URL_PATTERNS.some(p => p.test(url.trim()));
  }

  async analyze(url: string): Promise<MediaInfo> {
    const info = await fetchMediaInfo(url);
    const mediaInfo = buildMediaInfo(info, this.platform);

    // Add YouTube embed URL for preview
    if (info.id) {
      mediaInfo.embedUrl = `https://www.youtube.com/embed/${info.id}`;
    }

    return mediaInfo;
  }

  async getDownloadUrl(mediaInfo: MediaInfo, format: FormatOption): Promise<string> {
    return downloadMedia(mediaInfo.url, format.formatId);
  }
}
