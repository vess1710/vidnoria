import { readJSON, writeJSON, contentPath } from '@/lib/storage';
import {
  SeoApprovalRequest,
  SeoAuditLogEntry,
  SeoAuditReport,
  SeoContentDraft,
  SeoKeywordItem,
  SeoPeriodicReport,
  SeoRedirectRule,
  SeoSchedulerJobRecord,
} from './types';

// ============================================================================
// Vidnoria SEO Manager - Hybrid Storage (Cloudflare KV + File Storage)
// ============================================================================
// Uses Cloudflare KV REST API when CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN,
// and CLOUDFLARE_KV_NAMESPACE_ID are configured, and mirrors/falls back to
// atomic JSON files in content/seo/ with optimistic version locking.
// Secrets are NEVER stored in KV or JSON files.
// ============================================================================

export interface VersionedEnvelope<T> {
  version: number;
  updatedAt: string;
  data: T;
}

export interface SeoManagerSettings {
  selectedGscProperty: string;
  enableAutoAuditCron: boolean;
  enableAutoRecommendations: boolean;
  slackOrWebhookUrl?: string;
  updatedAt: string;
}

const KV_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const KV_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || '';
const KV_NAMESPACE_ID = process.env.CLOUDFLARE_KV_NAMESPACE_ID || '';

export function isCloudflareKvConfigured(): boolean {
  return Boolean(KV_ACCOUNT_ID && KV_API_TOKEN && KV_NAMESPACE_ID);
}

async function kvGet<T>(key: string): Promise<VersionedEnvelope<T> | null> {
  if (!isCloudflareKvConfigured()) return null;
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${KV_ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${KV_API_TOKEN}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as VersionedEnvelope<T>;
  } catch {
    return null;
  }
}

async function kvPut<T>(key: string, envelope: VersionedEnvelope<T>): Promise<boolean> {
  if (!isCloudflareKvConfigured()) return false;
  try {
    const url = `https://api.cloudflare.com/client/v4/accounts/${KV_ACCOUNT_ID}/storage/kv/namespaces/${KV_NAMESPACE_ID}/values/${encodeURIComponent(key)}`;
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${KV_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(envelope),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Reads a versioned store by key from Cloudflare KV (if configured) or local content/seo/<key>.json.
 */
export async function readSeoStore<T>(key: string, defaultValue: T): Promise<VersionedEnvelope<T>> {
  const filePath = contentPath('seo', `${key}.json`);

  if (isCloudflareKvConfigured()) {
    const remote = await kvGet<T>(key);
    if (remote && remote.data !== undefined) {
      return remote;
    }
  }

  const local = await readJSON<VersionedEnvelope<T> | T>(filePath);
  if (local && typeof local === 'object' && 'version' in (local as Record<string, unknown>) && 'data' in (local as Record<string, unknown>)) {
    return local as VersionedEnvelope<T>;
  }
  if (local !== null && local !== undefined) {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      data: local as T,
    };
  }

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    data: defaultValue,
  };
}

/**
 * Writes a versioned store with optimistic concurrency check.
 * If expectedVersion is provided and does not match the current version, throws a conflict error.
 */
export async function writeSeoStore<T>(
  key: string,
  data: T,
  expectedVersion?: number
): Promise<VersionedEnvelope<T>> {
  const current = await readSeoStore<T>(key, data);

  if (expectedVersion !== undefined && current.version !== expectedVersion && current.version > 1) {
    throw new Error(
      `CONCURRENCY_CONFLICT: Store "${key}" was modified concurrently (expected v${expectedVersion}, found v${current.version}).`
    );
  }

  const nextEnvelope: VersionedEnvelope<T> = {
    version: (current.version || 0) + 1,
    updatedAt: new Date().toISOString(),
    data,
  };

  const filePath = contentPath('seo', `${key}.json`);
  await writeJSON(filePath, nextEnvelope);

  if (isCloudflareKvConfigured()) {
    await kvPut(key, nextEnvelope);
  }

  return nextEnvelope;
}

// ---------------------------------------------------------------------------
// Specialized Store Accessors
// ---------------------------------------------------------------------------

export async function getSeoSettings(): Promise<SeoManagerSettings> {
  const env = await readSeoStore<SeoManagerSettings>('manager-settings', {
    selectedGscProperty: process.env.GSC_PROPERTY_URL || 'sc-domain:vidnoria.com',
    enableAutoAuditCron: true,
    enableAutoRecommendations: true,
    updatedAt: new Date().toISOString(),
  });
  return env.data;
}

export async function saveSeoSettings(settings: Partial<SeoManagerSettings>): Promise<SeoManagerSettings> {
  const current = await getSeoSettings();
  const updated: SeoManagerSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  await writeSeoStore('manager-settings', updated);
  return updated;
}

export async function getLatestAuditReport(): Promise<SeoAuditReport | null> {
  const env = await readSeoStore<SeoAuditReport | null>('latest-audit', null);
  return env.data;
}

export async function saveLatestAuditReport(report: SeoAuditReport): Promise<void> {
  await writeSeoStore('latest-audit', report);
}

export async function getApprovalRequests(): Promise<{ version: number; items: SeoApprovalRequest[] }> {
  const env = await readSeoStore<SeoApprovalRequest[]>('approvals', []);
  return { version: env.version, items: env.data };
}

export async function saveApprovalRequests(
  items: SeoApprovalRequest[],
  expectedVersion?: number
): Promise<void> {
  await writeSeoStore('approvals', items, expectedVersion);
}

export async function getSeoAuditLogs(): Promise<SeoAuditLogEntry[]> {
  const env = await readSeoStore<SeoAuditLogEntry[]>('audit-logs', []);
  return env.data;
}

export async function appendSeoAuditLog(
  entry: Omit<SeoAuditLogEntry, 'id' | 'timestamp'>
): Promise<SeoAuditLogEntry> {
  const logs = await getSeoAuditLogs();
  const fullEntry: SeoAuditLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [fullEntry, ...logs].slice(0, 250);
  await writeSeoStore('audit-logs', updated);
  return fullEntry;
}

export async function getContentDrafts(): Promise<SeoContentDraft[]> {
  const env = await readSeoStore<SeoContentDraft[]>('content-drafts', []);
  return env.data;
}

export async function saveContentDrafts(drafts: SeoContentDraft[]): Promise<void> {
  await writeSeoStore('content-drafts', drafts);
}

export async function getStoredKeywords(): Promise<SeoKeywordItem[]> {
  const env = await readSeoStore<SeoKeywordItem[]>('keywords', []);
  return env.data;
}

export async function saveStoredKeywords(keywords: SeoKeywordItem[]): Promise<void> {
  await writeSeoStore('keywords', keywords);
}

export async function getPeriodicReports(): Promise<SeoPeriodicReport[]> {
  const env = await readSeoStore<SeoPeriodicReport[]>('periodic-reports', []);
  return env.data;
}

export async function savePeriodicReports(reports: SeoPeriodicReport[]): Promise<void> {
  await writeSeoStore('periodic-reports', reports.slice(0, 50));
}

export async function getRedirectRules(): Promise<SeoRedirectRule[]> {
  const env = await readSeoStore<SeoRedirectRule[]>('redirects', []);
  return env.data;
}

export async function saveRedirectRules(rules: SeoRedirectRule[]): Promise<void> {
  await writeSeoStore('redirects', rules);
}

export const DEFAULT_SCHEDULER_JOBS: SeoSchedulerJobRecord[] = [
  {
    jobType: 'technical_audit',
    cronExpressionUtc: '0 0 * * *',
    scheduleLabelTr: 'Her gün 03:00 (TSİ) / 00:00 UTC',
    lastRunAt: null,
    lastStatus: 'idle',
    lastDurationMs: null,
    lastError: null,
  },
  {
    jobType: 'gsc_sync',
    cronExpressionUtc: '0 1 * * *',
    scheduleLabelTr: 'Her gün 04:00 (TSİ) / 01:00 UTC',
    lastRunAt: null,
    lastStatus: 'idle',
    lastDurationMs: null,
    lastError: null,
  },
  {
    jobType: 'recommendations',
    cronExpressionUtc: '0 2 * * *',
    scheduleLabelTr: 'Her gün 05:00 (TSİ) / 02:00 UTC',
    lastRunAt: null,
    lastStatus: 'idle',
    lastDurationMs: null,
    lastError: null,
  },
  {
    jobType: 'weekly_report',
    cronExpressionUtc: '0 3 * * 1',
    scheduleLabelTr: 'Her Pazartesi 06:00 (TSİ) / 03:00 UTC',
    lastRunAt: null,
    lastStatus: 'idle',
    lastDurationMs: null,
    lastError: null,
  },
  {
    jobType: 'monthly_report',
    cronExpressionUtc: '0 3 1 * *',
    scheduleLabelTr: 'Her Ayın 1\'i 06:00 (TSİ) / 03:00 UTC',
    lastRunAt: null,
    lastStatus: 'idle',
    lastDurationMs: null,
    lastError: null,
  },
];

export async function getSchedulerJobs(): Promise<SeoSchedulerJobRecord[]> {
  const env = await readSeoStore<SeoSchedulerJobRecord[]>('scheduler-jobs', DEFAULT_SCHEDULER_JOBS);
  return env.data;
}

export async function updateSchedulerJobStatus(
  jobType: SeoSchedulerJobRecord['jobType'],
  update: Partial<SeoSchedulerJobRecord>
): Promise<SeoSchedulerJobRecord[]> {
  const jobs = await getSchedulerJobs();
  const next = jobs.map(j => (j.jobType === jobType ? { ...j, ...update } : j));
  await writeSeoStore('scheduler-jobs', next);
  return next;
}
