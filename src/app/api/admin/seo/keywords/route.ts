import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, getAdminCorsHeaders, adminOptionsResponse } from '@/lib/admin/auth';
import { getManagedKeywords, upsertKeyword, deleteKeyword } from '@/lib/seo/keywords';

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
    const keywords = await getManagedKeywords();
    return NextResponse.json({ success: true, keywords }, { headers: corsHeaders });
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
    if (!body?.keyword || !body?.locale || !body?.category || !body?.targetPath) {
      return NextResponse.json({ success: false, error: 'Missing required keyword fields' }, { status: 400, headers: corsHeaders });
    }

    const saved = await upsertKeyword({
      keyword: body.keyword.trim(),
      locale: body.locale,
      category: body.category,
      targetPath: body.targetPath.trim(),
      notes: body.notes,
    });

    return NextResponse.json({ success: true, keyword: saved }, { headers: corsHeaders });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500, headers: corsHeaders });
  }
}

export async function DELETE(req: NextRequest) {
  const corsHeaders = getAdminCorsHeaders(req);
  const isAuth = await isAdminAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400, headers: corsHeaders });
  }

  const deleted = await deleteKeyword(id);
  return NextResponse.json({ success: deleted }, { headers: corsHeaders });
}
