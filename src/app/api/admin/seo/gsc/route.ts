import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, getAdminCorsHeaders, adminOptionsResponse } from '@/lib/admin/auth';
import { getGscAnalytics, generateGoogleAuthUrl, exchangeOAuthCode } from '@/lib/seo/gsc';
import { saveSeoSettings } from '@/lib/seo/storage';
import { SeoDateRange } from '@/lib/seo/types';

export async function OPTIONS(req: Request) {
  return adminOptionsResponse(req);
}

export async function GET(req: NextRequest) {
  const corsHeaders = getAdminCorsHeaders(req);
  const isAuth = await isAdminAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const range = (searchParams.get('range') || '28d') as SeoDateRange;
  const demo = searchParams.get('demo') === 'true';

  try {
    const analytics = await getGscAnalytics(range, demo);
    return NextResponse.json({ success: true, analytics }, { headers: corsHeaders });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(req: NextRequest) {
  const corsHeaders = getAdminCorsHeaders(req);
  const isAuth = await isAdminAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const action = body?.action;

    if (action === 'get_auth_url') {
      const redirectUri = body.redirectUri || `${new URL(req.url).origin}/api/admin/seo/gsc/callback`;
      const url = generateGoogleAuthUrl(redirectUri);
      return NextResponse.json({ success: true, url }, { headers: corsHeaders });
    }

    if (action === 'exchange_code') {
      const { code, redirectUri } = body;
      if (!code || !redirectUri) {
        return NextResponse.json({ success: false, error: 'Missing code or redirectUri' }, { status: 400, headers: corsHeaders });
      }
      const tokens = await exchangeOAuthCode(code, redirectUri);
      return NextResponse.json({ success: true, tokens }, { headers: corsHeaders });
    }

    if (action === 'select_property') {
      const { propertyUrl } = body;
      if (!propertyUrl) {
        return NextResponse.json({ success: false, error: 'Property URL is required' }, { status: 400, headers: corsHeaders });
      }
      await saveSeoSettings({ selectedGscProperty: propertyUrl });
      return NextResponse.json({ success: true, propertyUrl }, { headers: corsHeaders });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400, headers: corsHeaders });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500, headers: corsHeaders });
  }
}
