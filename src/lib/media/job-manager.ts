// ============================================================================
// Vidnoria - Job Manager (Disk + Memory Backed)
// ============================================================================
// Persists job state to os.tmpdir()/vidnoria/<jobId>.json so that all Next.js
// route workers and hot-reloads share the exact same job state and file paths.
// ============================================================================

import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import { DownloadJob, MediaInfo, FormatOption } from '@/types';
import { generateJobId } from '@/lib/security';
import { extractAudio } from './processor';
import { getAdapterByPlatform } from '@/lib/adapters';

const MAX_CONCURRENT_JOBS = 5;
const JOB_EXPIRATION_MS = 60 * 60 * 1000; // 1 hour
const TEMP_DIR = path.join(os.tmpdir(), 'vidnoria');

export interface InternalJob extends DownloadJob {
  filePath?: string;
  cancelRequested?: boolean;
}

class JobManager {
  private jobs = new Map<string, InternalJob>();
  private activeJobsCount = 0;
  private queue: string[] = [];

  constructor() {
    try {
      fsSync.mkdirSync(TEMP_DIR, { recursive: true });
    } catch {
      // ignore
    }
  }

  private getJobMetaPath(jobId: string): string {
    return path.join(/*turbopackIgnore: true*/ TEMP_DIR, `${jobId}.json`);
  }

  private saveJobToDisk(job: InternalJob): void {
    try {
      fsSync.mkdirSync(TEMP_DIR, { recursive: true });
      fsSync.writeFileSync(
        this.getJobMetaPath(job.jobId),
        JSON.stringify(job, null, 2),
        'utf-8'
      );
    } catch (e) {
      console.error('[JobManager] Failed to write job metadata:', e);
    }
  }

  private loadJobFromDisk(jobId: string): InternalJob | null {
    try {
      const metaPath = this.getJobMetaPath(jobId);
      if (!fsSync.existsSync(metaPath)) return null;
      const raw = fsSync.readFileSync(metaPath, 'utf-8');
      const job = JSON.parse(raw) as InternalJob;
      this.jobs.set(jobId, job);
      return job;
    } catch {
      return null;
    }
  }

  public async createJob(mediaInfo: MediaInfo, selectedFormat: FormatOption): Promise<DownloadJob> {
    const jobId = generateJobId();
    const job: InternalJob = {
      jobId,
      status: 'queued',
      progress: 5,
      mediaInfo,
      selectedFormat,
      createdAt: Date.now(),
      expiresAt: Date.now() + JOB_EXPIRATION_MS,
    };

    this.jobs.set(jobId, job);
    this.saveJobToDisk(job);
    this.queue.push(jobId);
    this.processNext();

    return this.sanitizeJob(job);
  }

  public getJob(jobId: string): DownloadJob | null {
    // Always read latest from disk in case another route worker updated it
    const diskJob = this.loadJobFromDisk(jobId);
    const job = diskJob || this.jobs.get(jobId);
    if (!job) return null;
    return this.sanitizeJob(job);
  }

  public getJobFilePath(jobId: string): string | null {
    const job = this.loadJobFromDisk(jobId) || this.jobs.get(jobId);
    if (!job || job.status !== 'completed' || !job.filePath) return null;
    return job.filePath;
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    const job = this.loadJobFromDisk(jobId) || this.jobs.get(jobId);
    if (!job) return false;

    job.cancelRequested = true;
    job.status = 'cancelled';
    this.saveJobToDisk(job);
    if (job.filePath) {
      await fs.unlink(job.filePath).catch(() => {});
    }
    return true;
  }

  private async processNext() {
    if (this.activeJobsCount >= MAX_CONCURRENT_JOBS || this.queue.length === 0) {
      return;
    }

    const jobId = this.queue.shift();
    if (!jobId) return;

    const job = this.jobs.get(jobId) || this.loadJobFromDisk(jobId);
    if (!job || job.cancelRequested) return;

    this.activeJobsCount++;
    job.status = 'processing';
    job.progress = 15;
    this.saveJobToDisk(job);

    try {
      const adapter = getAdapterByPlatform(job.mediaInfo.platform);
      if (!adapter) {
        throw new Error(`Platform adapter not found for ${job.mediaInfo.platform}`);
      }

      job.progress = 35;
      this.saveJobToDisk(job);

      // Download source file via adapter
      let downloadedPath = await adapter.getDownloadUrl(job.mediaInfo, job.selectedFormat);
      job.progress = 75;
      this.saveJobToDisk(job);

      // Post-processing if audio conversion is requested (MP3, M4A, etc.)
      if (job.selectedFormat.type === 'audio') {
        const audioFormat = job.selectedFormat.format as any;
        const alreadyM4a = audioFormat === 'm4a' && downloadedPath.toLowerCase().endsWith('.m4a');
        if (!alreadyM4a) {
          const converted = await extractAudio(downloadedPath, audioFormat, job.selectedFormat.bitrate || '192');
          await fs.unlink(downloadedPath).catch(() => {});
          downloadedPath = converted;
        }
      }

      job.progress = 100;
      job.status = 'completed';
      job.completedAt = Date.now();
      job.filePath = downloadedPath;
      job.downloadUrl = `/api/download/${job.jobId}/file`;
      this.saveJobToDisk(job);
    } catch (err: any) {
      job.status = 'failed';
      job.error = err.message || 'Processing failed';
      this.saveJobToDisk(job);
    } finally {
      this.activeJobsCount--;
      this.processNext();
    }
  }

  private sanitizeJob(job: InternalJob): DownloadJob {
    const { filePath, cancelRequested, ...safe } = job;
    return safe;
  }
}

/**
 * Remove temp files (media + job metadata) older than JOB_EXPIRATION_MS.
 */
async function cleanupExpiredFiles(): Promise<void> {
  try {
    const files = await fs.readdir(/*turbopackIgnore: true*/ TEMP_DIR);
    const now = Date.now();
    for (const f of files) {
      const full = path.join(/*turbopackIgnore: true*/ TEMP_DIR, f);
      try {
        const stat = await fs.stat(full);
        if (stat.isFile() && now - stat.mtimeMs > JOB_EXPIRATION_MS) {
          await fs.unlink(full);
        }
      } catch {
        // ignore individual file errors
      }
    }
  } catch {
    // temp dir missing — nothing to clean
  }
}

const globalForCleanup = globalThis as unknown as { vidnoriaCleanupTimer?: NodeJS.Timeout };
if (!globalForCleanup.vidnoriaCleanupTimer) {
  const timer = setInterval(cleanupExpiredFiles, 10 * 60 * 1000);
  if (timer.unref) timer.unref();
  globalForCleanup.vidnoriaCleanupTimer = timer;
  void cleanupExpiredFiles();
}

const globalForJobManager = globalThis as unknown as { jobManager?: JobManager };
export const jobManager = globalForJobManager.jobManager ?? new JobManager();
if (process.env.NODE_ENV !== 'production') globalForJobManager.jobManager = jobManager;
