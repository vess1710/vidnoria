import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { readJSON, writeJSON, contentPath } from '@/lib/storage';
import { SiteSettings } from '@/types';

export async function GET() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const settings = await readJSON<SiteSettings>(contentPath('settings', 'site.json'));
  return NextResponse.json({ success: true, settings });
}

export async function POST(req: NextRequest) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ success: false, error: 'Invalid settings body' }, { status: 400 });
  }

  await writeJSON(contentPath('settings', 'site.json'), body);
  return NextResponse.json({ success: true, message: 'Settings saved' });
}
