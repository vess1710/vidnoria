// ============================================================================
// Vidnoria - Security Utilities
// ============================================================================
// URL validation, SSRF protection, rate limiting, CSRF tokens, password
// hashing, filename sanitization, and XSS prevention.
// ============================================================================

import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'crypto';
import type { Platform } from '@/types';

// ---------------------------------------------------------------------------
// Platform URL Patterns
// ---------------------------------------------------------------------------

const PLATFORM_PATTERNS: Record<Platform, RegExp[]> = {
  youtube: [
    /^https?:\/\/(www\.|m\.|music\.)?youtube\.com\/watch\?.*v=[\w-]+/i,
    /^https?:\/\/youtu\.be\/[\w-]+/i,
    /^https?:\/\/(www\.|m\.)?youtube\.com\/shorts\/[\w-]+/i,
    /^https?:\/\/(www\.|m\.)?youtube\.com\/live\/[\w-]+/i,
    /^https?:\/\/(www\.)?youtube\.com\/embed\/[\w-]+/i,
  ],
  instagram: [
    /^https?:\/\/(www\.)?instagram\.com\/p\/[\w-]+/i,
    /^https?:\/\/(www\.)?instagram\.com\/reel\/[\w-]+/i,
    /^https?:\/\/(www\.)?instagram\.com\/tv\/[\w-]+/i,
    /^https?:\/\/(www\.)?instagram\.com\/stories\/[\w-]+\/[\d]+/i,
  ],
  tiktok: [
    /^https?:\/\/(www\.)?tiktok\.com\/@[\w.-]+\/video\/\d+/i,
    /^https?:\/\/vm\.tiktok\.com\/[\w-]+/i,
    /^https?:\/\/(www\.)?tiktok\.com\/t\/[\w-]+/i,
  ],
  facebook: [
    /^https?:\/\/(www\.)?facebook\.com\/[\w.-]+\/videos\/\d+/i,
    /^https?:\/\/(www\.)?facebook\.com\/watch\/?\?v=\d+/i,
    /^https?:\/\/fb\.watch\/[\w-]+/i,
    /^https?:\/\/(www\.)?facebook\.com\/reel\/\d+/i,
  ],
  twitter: [
    /^https?:\/\/(www\.)?twitter\.com\/[\w]+\/status\/\d+/i,
    /^https?:\/\/(www\.)?x\.com\/[\w]+\/status\/\d+/i,
  ],
};

// ---------------------------------------------------------------------------
// URL Validation
// ---------------------------------------------------------------------------

export interface UrlValidationResult {
  valid: boolean;
  platform?: Platform;
  error?: string;
}

/**
 * Validate a URL and identify which platform it belongs to.
 * Also performs SSRF checks to block private/internal network URLs.
 */
export function validateUrl(url: string): UrlValidationResult {
  // Basic format check
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  const trimmed = url.trim();
  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL is too long' };
  }

  // Parse the URL
  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // Only allow http(s)
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' };
  }

  // SSRF protection — block private IPs
  if (isPrivateIp(parsed.hostname)) {
    return { valid: false, error: 'Access to internal network addresses is not allowed' };
  }

  // Match against platform patterns
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(trimmed)) {
        return { valid: true, platform: platform as Platform };
      }
    }
  }

  return { valid: false, error: 'This URL is not from a supported platform' };
}

// ---------------------------------------------------------------------------
// SSRF Protection
// ---------------------------------------------------------------------------

/**
 * Check if a hostname resolves to a private or reserved IP range.
 * Blocks localhost, link-local, and RFC 1918 addresses.
 */
export function isPrivateIp(hostname: string): boolean {
  const lower = hostname.toLowerCase();

  // Localhost variants
  if (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '::1' ||
    lower === '[::1]' ||
    lower === '0.0.0.0' ||
    lower.endsWith('.localhost')
  ) {
    return true;
  }

  // IPv4 private ranges
  const ipv4Patterns = [
    /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/, // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // 172.16.0.0/12
    /^192\.168\.\d{1,3}\.\d{1,3}$/, // 192.168.0.0/16
    /^169\.254\.\d{1,3}\.\d{1,3}$/, // 169.254.0.0/16  (link-local)
    /^100\.(6[4-9]|[7-9]\d|1[0-1]\d|12[0-7])\.\d{1,3}\.\d{1,3}$/, // 100.64.0.0/10 (CGN)
    /^0\./, // 0.0.0.0/8
  ];

  for (const pattern of ipv4Patterns) {
    if (pattern.test(hostname)) {
      return true;
    }
  }

  // IPv6 private/reserved prefixes (simplified check)
  if (hostname.startsWith('fc') || hostname.startsWith('fd') || hostname.startsWith('fe80')) {
    return true;
  }

  return false;
}

// ---------------------------------------------------------------------------
// Filename Sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitize a string so it can be used safely as a filename.
 * Removes path separators, control characters, and trims length.
 */
export function sanitizeFilename(name: string): string {
  if (!name || typeof name !== 'string') return 'download';

  let safe = name
    // Remove path separators and null bytes
    .replace(/[/\\:*?"<>|\x00-\x1f]/g, '')
    // Replace whitespace sequences with a single underscore
    .replace(/\s+/g, '_')
    // Remove leading/trailing dots and underscores
    .replace(/^[._]+|[._]+$/g, '')
    .trim();

  // Limit length to 200 characters
  if (safe.length > 200) {
    safe = safe.substring(0, 200);
  }

  return safe || 'download';
}

// ---------------------------------------------------------------------------
// Job ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a UUID-based job ID with a timestamp prefix for easy sorting.
 * Format: `vid_<timestamp>_<uuid-first-8>`
 */
export function generateJobId(): string {
  const ts = Date.now().toString(36);
  const uuid = randomUUID().split('-')[0];
  return `vid_${ts}_${uuid}`;
}

// ---------------------------------------------------------------------------
// Password Hashing (using native crypto — no bcrypt dependency)
// ---------------------------------------------------------------------------
// We use PBKDF2 with SHA-512 for password hashing. This avoids a native
// bcrypt dependency which can be tricky to install on some systems.

const HASH_ITERATIONS = 100_000;
const HASH_KEY_LENGTH = 64;
const HASH_DIGEST = 'sha512';

/**
 * Hash a password using PBKDF2-SHA512.
 * Returns a string in the format `salt:hash` (both hex-encoded).
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = randomBytes(32).toString('hex');
    const { pbkdf2 } = require('crypto');
    pbkdf2(
      password,
      salt,
      HASH_ITERATIONS,
      HASH_KEY_LENGTH,
      HASH_DIGEST,
      (err: Error | null, derivedKey: Buffer) => {
        if (err) return reject(err);
        resolve(`${salt}:${derivedKey.toString('hex')}`);
      },
    );
  });
}

/**
 * Verify a password against a stored hash.
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return resolve(false);

    const { pbkdf2 } = require('crypto');
    pbkdf2(
      password,
      salt,
      HASH_ITERATIONS,
      HASH_KEY_LENGTH,
      HASH_DIGEST,
      (err: Error | null, derivedKey: Buffer) => {
        if (err) return reject(err);
        try {
          const a = Buffer.from(hash, 'hex');
          const b = derivedKey;
          resolve(a.length === b.length && timingSafeEqual(a, b));
        } catch {
          resolve(false);
        }
      },
    );
  });
}

// ---------------------------------------------------------------------------
// CSRF Token Generation & Verification
// ---------------------------------------------------------------------------

/**
 * Generate a cryptographically secure CSRF token.
 */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Verify a CSRF token using constant-time comparison to prevent timing attacks.
 */
export function verifyCsrfToken(token: string, stored: string): boolean {
  if (!token || !stored || token.length !== stored.length) {
    return false;
  }
  try {
    const a = Buffer.from(token, 'utf-8');
    const b = Buffer.from(stored, 'utf-8');
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Rate Limiter (in-memory, Map-based)
// ---------------------------------------------------------------------------

interface RateLimitEntry {
  /** Timestamps of requests within the current window */
  requests: number[];
}

interface RateLimiterConfig {
  /** Time window in milliseconds */
  windowMs: number;
  /** Maximum requests allowed within the window */
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Number of remaining requests in the current window */
  remaining: number;
  /** Milliseconds until the window resets */
  resetMs: number;
}

/**
 * Create a Map-based rate limiter.
 *
 * @example
 * ```ts
 * const limiter = createRateLimiter({ windowMs: 60_000, maxRequests: 10 });
 * const result = limiter.check('192.168.1.1');
 * if (!result.allowed) {
 *   // Return 429 Too Many Requests
 * }
 * ```
 */
export function createRateLimiter(config: RateLimiterConfig) {
  const store = new Map<string, RateLimitEntry>();

  // Periodically clean up expired entries every 60 seconds
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
      // Remove entries where all requests have expired
      const valid = entry.requests.filter((t) => now - t < config.windowMs);
      if (valid.length === 0) {
        store.delete(key);
      } else {
        entry.requests = valid;
      }
    }
  }, 60_000);

  // Allow the Node.js process to exit even if cleanup is pending
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return {
    /**
     * Check if a key (e.g. IP address) is within the rate limit.
     * Automatically records the request if allowed.
     */
    check(key: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(key) || { requests: [] };

      // Filter to only requests within the current window
      entry.requests = entry.requests.filter((t) => now - t < config.windowMs);

      if (entry.requests.length >= config.maxRequests) {
        const oldestInWindow = entry.requests[0];
        const resetMs = config.windowMs - (now - oldestInWindow);
        return {
          allowed: false,
          remaining: 0,
          resetMs: Math.max(0, resetMs),
        };
      }

      // Record this request
      entry.requests.push(now);
      store.set(key, entry);

      return {
        allowed: true,
        remaining: config.maxRequests - entry.requests.length,
        resetMs: config.windowMs,
      };
    },

    /**
     * Reset the rate limit for a specific key.
     */
    reset(key: string): void {
      store.delete(key);
    },

    /**
     * Clear all entries and stop the cleanup interval.
     */
    destroy(): void {
      store.clear();
      clearInterval(cleanupInterval);
    },
  };
}

// ---------------------------------------------------------------------------
// HTML Sanitization (XSS Prevention)
// ---------------------------------------------------------------------------

/**
 * Sanitize user-provided HTML to prevent XSS attacks.
 * Strips all HTML tags except a safe allow-list, removes event handlers,
 * javascript: URIs, and data: URIs.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // Allowed tags (content only — no attributes except href on <a>)
  const ALLOWED_TAGS = new Set([
    'b', 'i', 'em', 'strong', 'u', 'p', 'br', 'ul', 'ol', 'li',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
    'a', 'span',
  ]);

  let sanitized = html
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove style tags and their content
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    // Remove event handler attributes (on*)
    .replace(/\s+on\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, '')
    // Remove javascript: and data: URIs in attributes
    .replace(/(?:href|src|action)\s*=\s*(?:"javascript:[^"]*"|'javascript:[^']*')/gi, '')
    .replace(/(?:href|src|action)\s*=\s*(?:"data:[^"]*"|'data:[^']*')/gi, '');

  // Strip disallowed tags but keep their text content
  sanitized = sanitized.replace(/<\/?([a-z][\w-]*)\b[^>]*\/?>/gi, (match, tag) => {
    const tagLower = tag.toLowerCase();
    if (ALLOWED_TAGS.has(tagLower)) {
      // For allowed tags, strip all attributes except href on <a>
      if (tagLower === 'a') {
        const hrefMatch = match.match(/href\s*=\s*"([^"]*?)"/i) ||
                           match.match(/href\s*=\s*'([^']*?)'/i);
        if (hrefMatch && !hrefMatch[1].toLowerCase().startsWith('javascript:')) {
          const isClosing = match.startsWith('</');
          return isClosing ? '</a>' : `<a href="${escapeHtmlAttr(hrefMatch[1])}" rel="nofollow noopener" target="_blank">`;
        }
        // Strip href if it's javascript: or missing
        const isClosing = match.startsWith('</');
        return isClosing ? '</a>' : '<a rel="nofollow noopener">';
      }
      // Other allowed tags — strip all attributes
      const isClosing = match.startsWith('</');
      const isSelfClosing = match.endsWith('/>');
      if (isClosing) return `</${tagLower}>`;
      if (isSelfClosing) return `<${tagLower} />`;
      return `<${tagLower}>`;
    }
    // Disallowed tag — remove it entirely (content remains)
    return '';
  });

  return sanitized;
}

/**
 * Escape a string for safe use inside an HTML attribute.
 */
function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
