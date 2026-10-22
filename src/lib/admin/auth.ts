import { cookies } from 'next/headers';
import crypto from 'crypto';

const SESSION_COOKIE = 'vidnoria_admin_session';
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours

// Secret key for HMAC signing
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'vidnoria-super-secure-production-secret-key-change-me';

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
  if (!token) return false;

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

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
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
 */
export function checkAdminPassword(password: string): boolean {
  const expectedPassword = process.env.ADMIN_PASSWORD || 'VidnoriaSecure2026!';
  return password === expectedPassword;
}
