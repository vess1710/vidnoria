import { NextRequest, NextResponse } from 'next/server';
import { validateUrl, createRateLimiter } from '@/lib/security';
import { getAdapterForUrl } from '@/lib/adapters';
import { AnalysisResponse, MediaInfo } from '@/types';

// Rate limiter: 20 analysis requests per minute per IP
const analyzeLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 20,
});

// 5-minute in-memory cache for analyzed URLs (avoids duplicate yt-dlp calls on redirect)
const analysisCache = new Map<string, { data: MediaInfo; expiresAt: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '127.0.0.1';
    const rateCheck = analyzeLimiter.check(ip);

    if (!rateCheck.allowed) {
      return NextResponse.json<AnalysisResponse>(
        {
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please wait a moment and try again.',
          },
        },
        { status: 429, headers: corsHeaders }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.url || typeof body.url !== 'string') {
      return NextResponse.json<AnalysisResponse>(
        {
          success: false,
          error: {
            code: 'INVALID_URL',
            message: 'Please provide a valid URL string.',
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const trimmedUrl = body.url.trim();

    // Check cache first
    const cached = analysisCache.get(trimmedUrl);
    if (cached && cached.expiresAt > Date.now()) {
      return NextResponse.json<AnalysisResponse>(
        {
          success: true,
          data: cached.data,
        },
        { headers: corsHeaders }
      );
    }

    const validation = validateUrl(trimmedUrl);

    if (!validation.valid) {
      return NextResponse.json<AnalysisResponse>(
        {
          success: false,
          error: {
            code: validation.error?.includes('supported') ? 'UNSUPPORTED_PLATFORM' : 'INVALID_URL',
            message: validation.error || 'Invalid URL provided.',
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const adapter = getAdapterForUrl(trimmedUrl);
    if (!adapter) {
      return NextResponse.json<AnalysisResponse>(
        {
          success: false,
          error: {
            code: 'UNSUPPORTED_PLATFORM',
            message: 'This platform is not supported or currently disabled.',
          },
        },
        { status: 400, headers: corsHeaders }
      );
    }

    const mediaInfo = await adapter.analyze(trimmedUrl);

    // Cache result for 5 minutes
    analysisCache.set(trimmedUrl, {
      data: mediaInfo,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return NextResponse.json<AnalysisResponse>(
      {
        success: true,
        data: mediaInfo,
      },
      { headers: corsHeaders }
    );
  } catch (err: any) {
    const code = err.code || 'PROCESSING_ERROR';
    const message = err.message || 'Failed to process media request.';

    return NextResponse.json<AnalysisResponse>(
      {
        success: false,
        error: {
          code,
          message,
        },
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
