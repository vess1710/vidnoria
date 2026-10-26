import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated, getAdminCorsHeaders, adminOptionsResponse } from '@/lib/admin/auth';
import { runTechnicalSeoAudit } from '@/lib/seo/auditor';
import { getLatestAuditReport } from '@/lib/seo/storage';
import { createApprovalRequest } from '@/lib/seo/approvals';

export async function OPTIONS(req: Request) {
  return adminOptionsResponse(req);
}

export async function GET(req: Request) {
  const corsHeaders = getAdminCorsHeaders(req);
  const isAuth = await isAdminAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
  }

  const report = await getLatestAuditReport();
  if (!report) {
    // Run an initial audit if none exists
    const fresh = await runTechnicalSeoAudit({ includePageSpeed: false });
    return NextResponse.json({ success: true, report: fresh }, { headers: corsHeaders });
  }

  return NextResponse.json({ success: true, report }, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  const corsHeaders = getAdminCorsHeaders(req);
  const isAuth = await isAdminAuthenticated(req);
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers: corsHeaders });
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

    return NextResponse.json({ success: true, report }, { headers: corsHeaders });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500, headers: corsHeaders });
  }
}
