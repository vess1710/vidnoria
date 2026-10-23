import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE = 'vidnoria_admin_session';
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours

const isProduction = process.env.NODE_ENV === 'production';

// Secret key for HMAC signing. In production ADMIN_SECRET must be provided via environment;
// the development fallback is never used there.
const ADMIN_SECRET =
  process.env.ADMIN_SECRET || (isProduction ? '' : 'vidnoria-dev-only-secret');

/**
 * Creates an HMAC signed session token with an expiration timestamp.
 */
export function createSessionToken(): string {
  const expiresAt = Date.now() + SESSION_DURATION;
  const payload = `admin:${expiresAt}`;
  const signature = crypto.createHmac('sha256', ADMIN_SECRET).update(payload).digest('hex');
  return `${payload}:${signature}`;
}

/**
 * Validates a session token.
 */
export function verifySessionToken(token: string): boolean {
  if (!token || !ADMIN_SECRET) return false;

  const parts = token.split(':');
  if (parts.length !== 3) return false;

  const [user, expiresAtStr, signature] = parts;
  if (user !== 'admin') return false;

  const expiresAt = parseInt(expiresAtStr, 10);
  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    return false; // Expired
  }

  const expectedSignature = crypto
    .createHmac('sha256', ADMIN_SECRET)
    .update(`admin:${expiresAtStr}`)
    .digest('hex');

  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  // timingSafeEqual throws when lengths differ
  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

/**
 * Server-side check if current admin is authenticated.
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;
  if (!session) return false;
  return verifySessionToken(session);
}

/**
 * Check password against ADMIN_PASSWORD env variable.
 * In production, login is disabled until ADMIN_PASSWORD and ADMIN_SECRET are configured.
 */
export function checkAdminPassword(password: string): boolean {
  const expectedPassword = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'dev-admin-password');
  if (!expectedPassword || !ADMIN_SECRET) return false;

  const a = Buffer.from(password);
  const b = Buffer.from(expectedPassword);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
