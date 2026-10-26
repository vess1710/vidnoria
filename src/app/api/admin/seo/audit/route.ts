import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { runTechnicalSeoAudit } from '@/lib/seo/auditor';
import { getLatestAuditReport } from '@/lib/seo/storage';
import { createApprovalRequest } from '@/lib/seo/approvals';

export async function GET() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const report = await getLatestAuditReport();
  if (!report) {
    // Run an initial audit if none exists
    const fresh = await runTechnicalSeoAudit({ includePageSpeed: false });
    return NextResponse.json({ success: true, report: fresh });
  }

  return NextResponse.json({ success: true, report });
}

export async function POST(req: NextRequest) {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const includePageSpeed = Boolean(body?.includePageSpeed);

    const report = await runTechnicalSeoAudit({ includePageSpeed });

    // Automatically queue auto-proposable issues into Approval Queue
    for (const issue of report.issues) {
      if (issue.canAutoProposeFix && issue.recommendedValue && issue.changeType) {
        await createApprovalRequest({
          changeType: issue.changeType,
          targetPage: issue.pageUrl,
          pageKey: issue.pageKey,
          locale: issue.locale,
          issueSummary: issue.title,
          currentValue: issue.currentValue || '(Mevcut değer yok)',
          proposedValue: issue.recommendedValue,
          expectedBenefit: {
            tr: 'Google arama sonuçlarında görünürlüğü ve tıklama oranını (CTR) iyileştirir.',
            en: 'Improves SERP visibility and click-through rate.',
            ar: 'يحسن الظهور في نتائج البحث ومعدل النقر.',
          },
          riskLevel: issue.severity === 'critical' ? 'high' : 'low',
        }).catch(() => {});
      }
    }

    return NextResponse.json({ success: true, report });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
