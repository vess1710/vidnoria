import { NextResponse } from 'next/server';
import { readJSON, contentPath } from '@/lib/storage';
import type { SiteSettings } from '@/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Public, non-sensitive subset of site settings (ads, tracking IDs, platform toggles)
 * so ordinary visitors get the values configured in the admin panel.
 */
export async function GET() {
  const settings = await readJSON<SiteSettings>(contentPath('settings', 'site.json'));
  if (!settings) {
    return NextResponse.json({ success: false }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json(
    {
      success: true,
      settings: {
        ads: settings.ads,
        platforms: settings.platforms,
        seo: {
          googleAnalyticsId: settings.seo?.googleAnalyticsId || '',
          googleTagManagerId: settings.seo?.googleTagManagerId || '',
        },
      },
    },
    { headers: { ...corsHeaders, 'Cache-Control': 'public, max-age=60' } }
  );
}
