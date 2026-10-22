import { NextRequest, NextResponse } from 'next/server';
import { createRateLimiter } from '@/lib/security';
import { jobManager } from '@/lib/media/job-manager';
import { MediaInfo, FormatOption } from '@/types';

// Rate limit: 6 download initiation requests per minute per IP
const downloadLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 6,
});

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '127.0.0.1';
    const rateCheck = downloadLimiter.check(ip);

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Rate limit exceeded. Please wait a minute before downloading again.' },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.mediaInfo || !body.format) {
      return NextResponse.json(
        { success: false, error: 'Invalid download parameters.' },
        { status: 400 }
      );
    }

    const { mediaInfo, format } = body as { mediaInfo: MediaInfo; format: FormatOption };

    const job = await jobManager.createJob(mediaInfo, format);

    return NextResponse.json({
      success: true,
      job,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to start download job' },
      { status: 500 }
    );
  }
}
