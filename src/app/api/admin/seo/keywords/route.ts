import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { getManagedKeywords, upsertKeyword, deleteKeyword } from '@/lib/seo/keywords';

export async function GET() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const keywords = await getManagedKeywords();
    return NextResponse.json({ success: true, keywords });
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
    const body = await req.json();
    if (!body?.keyword || !body?.locale || !body?.category || !body?.targetPath) {
      return NextResponse.json({ success: false, error: 'Missing required keyword fields' }, { status: 400 });
    }

    const saved = await upsertKeyword({
      keyword: body.keyword.trim(),
      locale: body.locale,
      category: body.category,
      targetPath: body.targetPath.trim(),
      notes: body.notes,
    });

    return NextResponse.json({ success: true, keyword: saved });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
  }

  const deleted = await deleteKeyword(id);
  return NextResponse.json({ success: deleted });
}
