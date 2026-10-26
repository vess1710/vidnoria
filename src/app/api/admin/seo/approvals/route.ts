import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, getAdminCorsHeaders, adminOptionsResponse } from '@/lib/admin/auth';
import { getApprovalRequests } from '@/lib/seo/storage';
import { approveSeoChange, rejectSeoChange, rollbackSeoChange } from '@/lib/seo/approvals';

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
    const { version, items } = await getApprovalRequests();
    return NextResponse.json({ success: true, version, items }, { headers: corsHeaders });
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
    const { approvalId, action } = body;

    if (!approvalId) {
      return NextResponse.json({ success: false, error: 'approvalId is required' }, { status: 400, headers: corsHeaders });
    }

    if (action === 'approve') {
      const result = await approveSeoChange(approvalId, 'admin');
      return NextResponse.json(result, { headers: corsHeaders });
    }

    if (action === 'reject') {
      const result = await rejectSeoChange(approvalId, 'admin');
      return NextResponse.json({ success: true, request: result }, { headers: corsHeaders });
    }

    if (action === 'rollback') {
      const result = await rollbackSeoChange(approvalId, 'admin');
      return NextResponse.json(result, { headers: corsHeaders });
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400, headers: corsHeaders });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500, headers: corsHeaders });
  }
}
