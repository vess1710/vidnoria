import { NextRequest, NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const mediaUrl = searchParams.get('url');
    const filename = searchParams.get('filename') || 'vidnoria_instagram_media';

    if (!mediaUrl) {
      return NextResponse.json({ error: 'Missing url parameter' }, { status: 400, headers: corsHeaders });
    }

    // SSRF validation
    const parsed = new URL(mediaUrl);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return NextResponse.json({ error: 'Invalid protocol' }, { status: 400, headers: corsHeaders });
    }

    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('172.') ||
      host.startsWith('169.254.')
    ) {
      return NextResponse.json({ error: 'Forbidden host' }, { status: 403, headers: corsHeaders });
    }

    const upstreamRes = await fetch(mediaUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${upstreamRes.status}` },
        { status: upstreamRes.status, headers: corsHeaders }
      );
    }

    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    const cleanFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    return new NextResponse(upstreamRes.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${cleanFilename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Proxy fetch failed' },
      { status: 500, headers: corsHeaders }
    );
  }
}
