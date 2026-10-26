import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, getAdminCorsHeaders, adminOptionsResponse } from '@/lib/admin/auth';
import { readJSON, writeJSON, contentPath } from '@/lib/storage';
import { SiteSettings } from '@/types';

export async function OPTIONS(req: Request) {
  return adminOptionsResponse(req);
}

export async function GET(req: Request) {
  const corsHeaders = getAdminCorsHeaders(req);
  const isAuth = await isAdminAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const settings = await readJSON<SiteSettings>(contentPath('settings', 'site.json'));
  return NextResponse.json({ success: true, settings }, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getAdminCorsHeaders(req);
  const isAuth = await isAdminAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, error: 'Invalid settings body' }, { status: 400, headers: corsHeaders });
  }

  await writeJSON(contentPath('settings', 'site.json'), body);
  return NextResponse.json({ success: true, message: 'Settings saved' }, { headers: corsHeaders });
}
