/**
 * Vidnoria - Standalone Cloudflare SEO Scheduler Worker
 *
 * Runs scheduled SEO automation cron jobs in UTC corresponding to Turkey Time (UTC+3):
 * - 00:00 UTC (03:00 TSİ): Technical SEO Audit
 * - 01:00 UTC (04:00 TSİ): Search Console Sync
 * - 02:00 UTC (05:00 TSİ): Anomaly Analysis & Fix Recommendations
 * - 03:00 UTC (Her Pazartesi 06:00 TSİ): Weekly Performance Report
 * - 03:00 UTC (Her Ayın 1'i 06:00 TSİ): Monthly SEO Report
 */

export interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ScheduledEvent {
  cron: string;
  scheduledTime: number;
}

export interface ExecutionContext {
  waitUntil(promise: Promise<any>): void;
}

export interface Env {
  VIDNORIA_SEO_KV?: KVNamespace;
  BACKEND_API_BASE?: string;
  SEO_CRON_SECRET?: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    const cron = event.cron;
    const cronTime = new Date(event.scheduledTime).toISOString();
    console.log(`[SEO-Scheduler] Cron triggered at ${cronTime} with expression: "${cron}"`);

    const apiBase = env.BACKEND_API_BASE || 'https://vidnoria.com';
    const cronSecret = env.SEO_CRON_SECRET || '';

    // Route cron event to appropriate job type
    let jobType = 'technical_audit';
    if (cron === '0 1 * * *') jobType = 'gsc_sync';
    else if (cron === '0 2 * * *') jobType = 'recommendations';
    else if (cron === '0 3 * * 1') jobType = 'weekly_report';
    else if (cron === '0 3 1 * *') jobType = 'monthly_report';

    // Concurrency Lock Check via KV
    const lockKey = `lock:seo-job:${jobType}`;
    if (env.VIDNORIA_SEO_KV) {
      const activeLock = await env.VIDNORIA_SEO_KV.get(lockKey);
      if (activeLock) {
        console.warn(`[SEO-Scheduler] Job "${jobType}" is already running with lock ${activeLock}. Skipping duplicate execution.`);
        return;
      }
      // Set lock for 10 minutes
      await env.VIDNORIA_SEO_KV.put(lockKey, cronTime, { expirationTtl: 600 });
    }

    ctx.waitUntil(
      (async () => {
        try {
          const endpoint = `${apiBase}/api/admin/seo/audit`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Vidnoria-Cron-Secret': cronSecret,
            },
            body: JSON.stringify({
              triggeredBy: 'cloudflare_cron',
              jobType,
              cron,
              timestamp: cronTime,
            }),
          });
          console.log(`[SEO-Scheduler] Job "${jobType}" dispatched to ${endpoint} - Status: ${res.status}`);
        } catch (err: any) {
          console.error(`[SEO-Scheduler] Job "${jobType}" failed:`, err.message);
        } finally {
          if (env.VIDNORIA_SEO_KV) {
            await env.VIDNORIA_SEO_KV.delete(lockKey).catch(() => {});
          }
        }
      })()
    );
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    return new Response(
      JSON.stringify({
        status: 'ok',
        service: 'Vidnoria SEO Scheduler Worker',
        timestamp: new Date().toISOString(),
        crons: [
          { cron: '0 0 * * *', label: '03:00 TSİ - Technical SEO Audit' },
          { cron: '0 1 * * *', label: '04:00 TSİ - Search Console Sync' },
          { cron: '0 2 * * *', label: '05:00 TSİ - Anomaly & Opportunity Analysis' },
          { cron: '0 3 * * 1', label: 'Pazartesi 06:00 TSİ - Weekly Report' },
          { cron: '0 3 1 * *', label: 'Ayın 1\'i 06:00 TSİ - Monthly Report' },
        ],
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  },
};
