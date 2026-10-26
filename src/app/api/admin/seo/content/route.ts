import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, getAdminCorsHeaders, adminOptionsResponse } from '@/lib/admin/auth';
import {
  CURATED_TOPIC_SUGGESTIONS,
  generateContentDraft,
} from '@/lib/seo/content-manager';
import { getContentDrafts } from '@/lib/seo/storage';

export async function OPTIONS(req: Request) {
  return adminOptionsResponse(req);
}

export async function GET(req: Request) {
  const corsHeaders = getAdminCorsHeaders(req);
  const isAuth = await isAdminAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  try {
    const drafts = await getContentDrafts();
    return NextResponse.json(
      {
        success: true,
        drafts,
        curatedSuggestions: CURATED_TOPIC_SUGGESTIONS,
      },
      { headers: corsHeaders }
    );
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
    const body = await req.json().catch(() => ({}));
    const topicId = body?.topicId || CURATED_TOPIC_SUGGESTIONS[0].id;

    const draft = await generateContentDraft(topicId);
    return NextResponse.json({ success: true, draft }, { headers: corsHeaders });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500, headers: corsHeaders });
  }
}
