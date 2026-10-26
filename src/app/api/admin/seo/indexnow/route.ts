import { NextResponse } from 'next/server';
import { submitToIndexNow } from '@/lib/seo/indexnow';

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const urls: string[] = Array.isArray(body.urls) && body.urls.length > 0
      ? body.urls
      : [
          'https://vidnoria.com/tr',
          'https://vidnoria.com/en',
          'https://vidnoria.com/ar',
          'https://vidnoria.com/tr/video-converter',
          'https://vidnoria.com/tr/image-converter',
          'https://vidnoria.com/tr/audio-cutter',
          'https://vidnoria.com/tr/youtube-video-indir',
          'https://vidnoria.com/tr/instagram-video-indir',
          'https://vidnoria.com/tr/tiktok-video-indir',
          'https://vidnoria.com/tr/pinterest-video-indir',
          'https://vidnoria.com/tr/reddit-video-indir',
        ];

    const result = await submitToIndexNow(urls);
    return NextResponse.json(result);
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, message: err instanceof Error ? err.message : 'IndexNow trigger error' },
      { status: 500 }
    );
  }
}
