import { Locale } from '@/lib/i18n';

// ============================================================================
// Vidnoria SEO Manager - TypeScript Data Models
// ============================================================================

export type SeoDateRange = '7d' | '28d' | '90d';
export type SeoAuditSeverity = 'critical' | 'warning' | 'suggestion';

export type SeoAuditCategory =
  | 'title'
  | 'description'
  | 'canonical'
  | 'robots'
  | 'sitemap'
  | 'hreflang'
  | 'html_lang'
  | 'headings'
  | 'internal_links'
  | 'images_alt'
  | 'duplicate_title'
  | 'duplicate_description'
  | 'redirects'
  | 'http_status'
  | 'noindex'
  | 'open_graph'
  | 'structured_data'
  | 'mobile_usability'
  | 'performance';

export type SeoChangeType =
  | 'seo_title'
  | 'meta_description'
  | 'canonical'
  | 'hreflang'
  | 'robots_txt'
  | 'sitemap'
  | 'blog_publish'
  | 'content_update'
  | 'redirect_rule'
  | 'structured_data';

export type SeoRiskLevel = 'low' | 'medium' | 'high';

export type SeoKeywordCategory =
  | 'priority'
  | 'rising'
  | 'declining'
  | 'opportunities'
  | 'page_optimization';

// ---------------------------------------------------------------------------
// Google Search Console Types
// ---------------------------------------------------------------------------

export interface GscMetricsSummary {
  clicks: number;
  impressions: number;
  ctr: number; // percentage e.g. 4.82
  position: number; // average position e.g. 8.4
  prevClicks?: number;
  prevImpressions?: number;
  prevCtr?: number;
  prevPosition?: number;
  clicksDeltaPercent?: number;
  impressionsDeltaPercent?: number;
  ctrDeltaPercent?: number;
  positionDelta?: number; // positive means improved (e.g. 10.2 -> 8.1 = +2.1)
}

export interface GscDailyMetric {
  date: string; // YYYY-MM-DD
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscQueryRow {
  query: string;
  locale: Locale | 'other';
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  prevPosition?: number;
  positionChange?: number; // positive = rank improved
  trend: 'rising' | 'declining' | 'stable' | 'new';
}

export interface GscPageRow {
  page: string;
  locale: Locale | 'other';
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  prevClicks?: number;
  clicksChangePercent?: number;
}

export interface GscDimensionRow {
  key: string; // country code, device (MOBILE/DESKTOP/TABLET), or language (/tr, /en, /ar)
  label: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface GscInsightItem {
  id: string;
  type:
    | 'high_impressions_low_ctr'
    | 'improving_query'
    | 'declining_query'
    | 'traffic_drop_page'
    | 'new_query_visibility'
    | 'underperforming_content';
  priority: 'high' | 'medium' | 'low';
  target: string; // URL or query
  locale?: Locale;
  title: Record<Locale, string>;
  detail: Record<Locale, string>;
  recommendedAction: Record<Locale, string>;
  metrics: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
    delta?: number;
  };
}

export interface GscAnalyticsPayload {
  connected: boolean;
  isDemoMode: boolean;
  propertyUrl: string | null;
  availableProperties: string[];
  range: SeoDateRange;
  lastSyncedAt: string | null;
  dataLagNotice: Record<Locale, string>;
  connectionReason?: string;
  summary: GscMetricsSummary | null;
  dailySeries: GscDailyMetric[];
  topQueries: GscQueryRow[];
  topPages: GscPageRow[];
  byCountry: GscDimensionRow[];
  byDevice: GscDimensionRow[];
  byLanguage: GscDimensionRow[];
  insights: GscInsightItem[];
}

// ---------------------------------------------------------------------------
// Technical SEO Audit & Multilingual Matrix Types
// ---------------------------------------------------------------------------

export interface SeoAuditIssue {
  id: string;
  severity: SeoAuditSeverity;
  category: SeoAuditCategory;
  pageUrl: string;
  pageKey?: string;
  locale?: Locale;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  currentValue?: string;
  recommendedValue?: string;
  canAutoProposeFix: boolean;
  changeType?: SeoChangeType;
}

export interface MultilingualRouteCheck {
  routeKey: string;
  subPath: string;
  localesPresent: Record<Locale, boolean>;
  titles: Record<Locale, string>;
  descriptions: Record<Locale, string>;
  canonicals: Record<Locale, string>;
  hreflangValid: boolean;
  xDefaultUrl: string;
  hasUniqueLocalizedTitles: boolean;
  hasUniqueLocalizedDescriptions: boolean;
  issues: string[];
}

export interface CoreWebVitalsMetrics {
  strategy: 'mobile' | 'desktop';
  source: 'pagespeed_api' | 'unavailable';
  fetchedAt: string | null;
  performanceScore: number | null; // 0-100 only if real PSI API returned data
  lcpMs: number | null;
  cls: number | null;
  inpMs: number | null;
  fcpMs: number | null;
  ttfbMs: number | null;
  statusMessage: Record<Locale, string>;
}

export interface SeoAuditReport {
  id: string;
  auditedAt: string;
  totalPagesChecked: number;
  healthScore: number; // 0-100 calculated from real technical checks
  counts: {
    critical: number;
    warning: number;
    suggestion: number;
    passed: number;
  };
  issues: SeoAuditIssue[];
  multilingualMatrix: MultilingualRouteCheck[];
  robotsTxtStatus: {
    valid: boolean;
    adminDisallowed: boolean;
    apiDisallowed: boolean;
    sitemapDeclared: boolean;
    rawPreview: string;
  };
  sitemapStatus: {
    valid: boolean;
    totalUrls: number;
    localesCovered: Locale[];
    hasAlternates: boolean;
  };
  coreWebVitals: {
    mobile: CoreWebVitalsMetrics;
    desktop: CoreWebVitalsMetrics;
  };
}

// ---------------------------------------------------------------------------
// Keyword Manager Types
// ---------------------------------------------------------------------------

export interface SeoKeywordItem {
  id: string;
  keyword: string;
  locale: Locale;
  category: SeoKeywordCategory;
  targetPath: string; // e.g. /tr/youtube-video-downloader
  inTitle: boolean;
  inDescription: boolean;
  inH1: boolean;
  inSlug: boolean;
  optimizationScore: number; // 0-100 based on on-page signals
  // Real GSC metrics (null if GSC not connected or query has no impressions)
  gscClicks: number | null;
  gscImpressions: number | null;
  gscCtr: number | null;
  gscPosition: number | null;
  gscPositionDelta: number | null;
  notes?: Record<Locale, string>;
}

// ---------------------------------------------------------------------------
// Content Manager & Draft Types
// ---------------------------------------------------------------------------

export interface InternalLinkSuggestion {
  anchorText: Record<Locale, string>;
  targetPath: Record<Locale, string>;
  reason: Record<Locale, string>;
}

export interface SeoContentDraft {
  id: string;
  slug: string;
  targetKeyword: Record<Locale, string>;
  category: string;
  status: 'draft' | 'pending_approval' | 'approved_published' | 'rejected';
  title: Record<Locale, string>;
  seoTitle: Record<Locale, string>;
  seoDescription: Record<Locale, string>;
  outline: Record<Locale, { h1: string; h2s: string[]; h3s: string[] }>;
  contentMarkdown: Record<Locale, string>;
  internalLinks: InternalLinkSuggestion[];
  createdAt: string;
  updatedAt: string;
  approvalId?: string;
}

// ---------------------------------------------------------------------------
// Semi-Automatic Approval & Rollback System Types
// ---------------------------------------------------------------------------

export interface SeoApprovalRequest {
  id: string;
  changeType: SeoChangeType;
  status: 'pending' | 'approved' | 'rejected' | 'rolled_back';
  targetPage: string;
  pageKey?: string;
  locale?: Locale;
  issueSummary: Record<Locale, string>;
  currentValue: string;
  proposedValue: string;
  expectedBenefit: Record<Locale, string>;
  riskLevel: SeoRiskLevel;
  createdAt: string;
  decidedAt?: string;
  decidedBy?: string;
  rolledBackAt?: string;
  metadataPayload?: Record<string, unknown>;
  githubPrSuggested?: boolean;
}

export interface SeoAuditLogEntry {
  id: string;
  timestamp: string;
  action:
    | 'audit_run'
    | 'gsc_sync'
    | 'approval_created'
    | 'change_approved'
    | 'change_rejected'
    | 'change_rolled_back'
    | 'draft_created'
    | 'cron_executed'
    | 'settings_updated';
  actor: 'admin' | 'system_cron';
  target: string;
  summary: string;
  previousValue?: string;
  newValue?: string;
  approvalId?: string;
}

// ---------------------------------------------------------------------------
// Cloudflare Scheduler & Periodic Reports
// ---------------------------------------------------------------------------

export interface SeoSchedulerJobRecord {
  jobType: 'technical_audit' | 'gsc_sync' | 'recommendations' | 'weekly_report' | 'monthly_report';
  cronExpressionUtc: string;
  scheduleLabelTr: string;
  lastRunAt: string | null;
  lastStatus: 'idle' | 'running' | 'success' | 'failed';
  lastDurationMs: number | null;
  lastError: string | null;
}

export interface SeoPeriodicReport {
  id: string;
  type: 'weekly' | 'monthly';
  generatedAt: string;
  periodStart: string;
  periodEnd: string;
  healthScore: number;
  criticalIssues: number;
  warnings: number;
  pendingApprovals: number;
  appliedFixes: number;
  gscSummary: GscMetricsSummary | null;
  highlights: Record<Locale, string[]>;
}

export interface SeoRedirectRule {
  from: string;
  to: string;
  statusCode: 301 | 302 | 307 | 308;
  createdAt: string;
}
