import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { getApprovalRequests } from '@/lib/seo/storage';
import { approveSeoChange, rejectSeoChange, rollbackSeoChange } from '@/lib/seo/approvals';

export async function GET() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { version, items } = await getApprovalRequests();
    return NextResponse.json({ success: true, version, items });
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
    const { approvalId, action } = body;

    if (!approvalId) {
      return NextResponse.json({ success: false, error: 'approvalId is required' }, { status: 400 });
    }

    if (action === 'approve') {
      const result = await approveSeoChange(approvalId, 'admin');
      return NextResponse.json(result);
    }

    if (action === 'reject') {
      const result = await rejectSeoChange(approvalId, 'admin');
      return NextResponse.json({ success: true, request: result });
    }

    if (action === 'rollback') {
      const result = await rollbackSeoChange(approvalId, 'admin');
      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
