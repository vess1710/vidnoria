// ============================================================================
// Vidnoria - File-Based Storage System
// ============================================================================
// Provides atomic JSON read/write, Markdown frontmatter support, file locking,
// backup & recovery for the content directory.
// ============================================================================

import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { randomUUID } from 'crypto';

/** Base content directory resolved from project root */
const CONTENT_DIR = path.join(process.cwd(), 'content');

/** Lock file timeout in milliseconds */
const LOCK_TIMEOUT_MS = 10_000;

/** Lock file stale threshold — if a lock file is older than this, it's removed */
const LOCK_STALE_MS = 30_000;

// ---------------------------------------------------------------------------
// Directory & File Utilities
// ---------------------------------------------------------------------------

/**
 * Ensure a directory exists, creating it recursively if necessary.
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

/**
 * Check whether a file exists at the given path.
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * List files in a directory, optionally filtering by extension.
 * @param dirPath - Absolute path to the directory
 * @param extension - Optional file extension to filter by (e.g. '.json')
 * @returns Array of absolute file paths
 */
export async function listFiles(
  dirPath: string,
  extension?: string,
): Promise<string[]> {
  try {
    const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
    let files = entries
      .filter((e) => e.isFile())
      .map((e) => path.join(dirPath, e.name));

    if (extension) {
      const ext = extension.startsWith('.') ? extension : `.${extension}`;
      files = files.filter((f) => path.extname(f).toLowerCase() === ext.toLowerCase());
    }

    return files;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// File Locking (simple lock-file approach)
// ---------------------------------------------------------------------------

/**
 * Acquire a file lock. Creates a `.lock` file next to the target.
 * Waits up to LOCK_TIMEOUT_MS for an existing lock to release. If the lock
 * file is older than LOCK_STALE_MS it is forcefully removed (crash recovery).
 */
async function acquireLock(filePath: string): Promise<string> {
  const lockPath = `${filePath}.lock`;
  const deadline = Date.now() + LOCK_TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      // wx = exclusive create — fails if the file already exists
      await fs.promises.writeFile(lockPath, String(process.pid), { flag: 'wx' });
      return lockPath;
    } catch {
      // Lock file already exists — check if it's stale
      try {
        const stat = await fs.promises.stat(lockPath);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          // Stale lock, forcefully remove it
          await fs.promises.unlink(lockPath).catch(() => {});
          continue;
        }
      } catch {
        // Lock file disappeared between our check — retry
        continue;
      }
      // Wait a short interval before retrying
      await new Promise((r) => setTimeout(r, 50));
    }
  }

  throw new Error(`Failed to acquire lock for ${filePath} within ${LOCK_TIMEOUT_MS}ms`);
}

/**
 * Release a previously acquired file lock.
 */
async function releaseLock(lockPath: string): Promise<void> {
  await fs.promises.unlink(lockPath).catch(() => {});
}

// ---------------------------------------------------------------------------
// Backup & Recovery
// ---------------------------------------------------------------------------

/**
 * Create a backup of a file (copies to `<file>.bak`).
 * Silently succeeds if the source file doesn't exist.
 */
export async function backupFile(filePath: string): Promise<void> {
  try {
    await fs.promises.copyFile(filePath, `${filePath}.bak`);
  } catch {
    // Source file doesn't exist — nothing to back up
  }
}

// ---------------------------------------------------------------------------
// JSON Storage
// ---------------------------------------------------------------------------

/**
 * Read and parse a JSON file. If the primary file is corrupted, attempts to
 * recover from the `.bak` backup file.
 *
 * @param filePath - Absolute path to the JSON file
 * @returns Parsed data, or `null` if the file (and backup) cannot be read
 */
export async function readJSON<T = unknown>(filePath: string): Promise<T | null> {
  // Try primary file first
  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    // Primary failed — try backup
    const backupPath = `${filePath}.bak`;
    try {
      const raw = await fs.promises.readFile(backupPath, 'utf-8');
      const data = JSON.parse(raw) as T;

      // Restore the backup as the primary file so next read succeeds
      await fs.promises.copyFile(backupPath, filePath).catch(() => {});
      console.warn(`[storage] Recovered ${filePath} from backup`);

      return data;
    } catch {
      return null;
    }
  }
}

async function safeAtomicRename(tmpPath: string, targetPath: string): Promise<void> {
  for (let i = 0; i < 10; i++) {
    try {
      await fs.promises.rename(tmpPath, targetPath);
      return;
    } catch (err: any) {
      if ((err.code === 'EPERM' || err.code === 'EBUSY') && i < 9) {
        await new Promise((resolve) => setTimeout(resolve, 30));
      } else if (i === 9) {
        // Fallback for Windows locked file handles
        await fs.promises.copyFile(tmpPath, targetPath);
        await fs.promises.unlink(tmpPath).catch(() => {});
        return;
      } else {
        throw err;
      }
    }
  }
}

/**
 * Write data to a JSON file atomically.
 *
 * Strategy:
 * 1. Acquire a file lock
 * 2. Back up the existing file (if any)
 * 3. Write to a temporary file
 * 4. Rename the temp file to the target path (with retry & copy fallback on Windows)
 * 5. Release the lock
 *
 * @param filePath - Absolute path to the JSON file
 * @param data - Data to serialize
 */
export async function writeJSON<T = unknown>(
  filePath: string,
  data: T,
): Promise<void> {
  await ensureDir(path.dirname(filePath));

  const lockPath = await acquireLock(filePath);
  try {
    // Back up existing file
    await backupFile(filePath);

    // Write to a temp file next to the target
    const tmpPath = `${filePath}.${randomUUID()}.tmp`;
    await fs.promises.writeFile(tmpPath, JSON.stringify(data, null, 2), 'utf-8');

    // Atomic rename
    await safeAtomicRename(tmpPath, filePath);
  } finally {
    await releaseLock(lockPath);
  }
}

// ---------------------------------------------------------------------------
// Markdown Storage (with gray-matter frontmatter)
// ---------------------------------------------------------------------------

export interface MarkdownFile<T extends Record<string, unknown> = Record<string, unknown>> {
  frontmatter: T;
  content: string;
}

/**
 * Read a Markdown file and parse its YAML frontmatter.
 *
 * @param filePath - Absolute path to the Markdown file
 * @returns Parsed frontmatter + body content, or `null` if unreadable
 */
export async function readMarkdown<
  T extends Record<string, unknown> = Record<string, unknown>,
>(filePath: string): Promise<MarkdownFile<T> | null> {
  try {
    const raw = await fs.promises.readFile(filePath, 'utf-8');
    const { data, content } = matter(raw);
    return { frontmatter: data as T, content };
  } catch {
    return null;
  }
}

/**
 * Write a Markdown file with YAML frontmatter.
 *
 * @param filePath - Absolute path to the Markdown file
 * @param frontmatter - Key-value data to serialize as YAML frontmatter
 * @param content - Markdown body content
 */
export async function writeMarkdown(
  filePath: string,
  frontmatter: Record<string, unknown>,
  content: string,
): Promise<void> {
  await ensureDir(path.dirname(filePath));

  const lockPath = await acquireLock(filePath);
  try {
    await backupFile(filePath);

    const output = matter.stringify(content, frontmatter);
    const tmpPath = `${filePath}.${randomUUID()}.tmp`;
    await fs.promises.writeFile(tmpPath, output, 'utf-8');
    await safeAtomicRename(tmpPath, filePath);
  } finally {
    await releaseLock(lockPath);
  }
}

// ---------------------------------------------------------------------------
// Convenience: resolve a path relative to the content directory
// ---------------------------------------------------------------------------

/**
 * Resolve a path relative to the `content/` directory.
 * @example contentPath('settings', 'site.json') → '<cwd>/content/settings/site.json'
 */
export function contentPath(...segments: string[]): string {
  return path.join(CONTENT_DIR, ...segments);
}
