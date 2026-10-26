import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import {
  CURATED_TOPIC_SUGGESTIONS,
  generateContentDraft,
} from '@/lib/seo/content-manager';
import { getContentDrafts } from '@/lib/seo/storage';

export async function GET() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const drafts = await getContentDrafts();
    return NextResponse.json({
      success: true,
      drafts,
      curatedSuggestions: CURATED_TOPIC_SUGGESTIONS,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const topicId = body?.topicId || CURATED_TOPIC_SUGGESTIONS[0].id;

    const draft = await generateContentDraft(topicId);
    return NextResponse.json({ success: true, draft });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
