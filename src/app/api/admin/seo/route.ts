import { NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import {
  getLatestAuditReport,
  getApprovalRequests,
  getStoredKeywords,
  getContentDrafts,
  getSeoAuditLogs,
  getSchedulerJobs,
  getSeoSettings,
} from '@/lib/seo/storage';
import { getGscAnalytics } from '@/lib/seo/gsc';

export async function GET() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const [latestAudit, approvals, keywords, drafts, logs, scheduler, settings, gscDemo] =
      await Promise.all([
        getLatestAuditReport(),
        getApprovalRequests(),
        getStoredKeywords(),
        getContentDrafts(),
        getSeoAuditLogs(),
        getSchedulerJobs(),
        getSeoSettings(),
        getGscAnalytics('28d', false),
      ]);

    const pendingApprovals = approvals.items.filter(a => a.status === 'pending');

    return NextResponse.json({
      success: true,
      data: {
        settings,
        healthScore: latestAudit?.healthScore ?? 100,
        lastAuditedAt: latestAudit?.auditedAt ?? null,
        counts: {
          pendingApprovals: pendingApprovals.length,
          totalApprovals: approvals.items.length,
          criticalIssues: latestAudit?.counts.critical ?? 0,
          warnings: latestAudit?.counts.warning ?? 0,
          suggestions: latestAudit?.counts.suggestion ?? 0,
          managedKeywords: keywords.length,
          contentDrafts: drafts.length,
        },
        gscConnected: gscDemo.connected,
        gscSummary: gscDemo.summary,
        schedulerJobs: scheduler,
        recentLogs: logs.slice(0, 10),
      },
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error }, { status: 500 });
  }
}
