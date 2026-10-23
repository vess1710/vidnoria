import type { PlatformAdapter } from './base';
import type { MediaInfo, FormatOption } from '@/types';
import { PLATFORM_PATTERNS } from '@/lib/security';
import { fetchMediaInfo, buildMediaInfo, downloadMedia } from './yt-dlp';

const URL_PATTERNS = PLATFORM_PATTERNS.youtube;

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
