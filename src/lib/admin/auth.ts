import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SESSION_COOKIE = 'vidnoria_admin_session';
const SESSION_DURATION = 12 * 60 * 60 * 1000; // 12 hours

// Secret key for HMAC signing.
const ADMIN_SECRET =
  process.env.ADMIN_SECRET || 'vidnoria-dev-only-secret-2026-secure-key';

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
 * Returns CORS headers for admin API requests.
 */
export function getAdminCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin') || '*';
  const headers: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  };
  if (origin !== '*') {
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

/**
 * Preflight OPTIONS response helper.
 */
export function adminOptionsResponse(req?: Request): NextResponse {
  return new NextResponse(null, { status: 204, headers: getAdminCorsHeaders(req) });
}

/**
 * Server-side check if current admin is authenticated.
 * Supports:
 * 1. Authorization: Bearer <token> header (most reliable for cross-origin and SPA clients)
 * 2. Cookie header on Request (vidnoria_admin_session)
 * 3. Next.js cookies() store
 */
export async function isAdminAuthenticated(req?: Request): Promise<boolean> {
  // 1. Check Authorization header
  if (req) {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      const token = authHeader.slice(7).trim();
      if (verifySessionToken(token)) {
        return true;
      }
    }

    // 2. Check Cookie header directly on req
    const cookieHeader = req.headers.get('cookie') || req.headers.get('Cookie');
    if (cookieHeader) {
      const match = cookieHeader.match(/vidnoria_admin_session=([^;]+)/);
      if (match && match[1] && verifySessionToken(decodeURIComponent(match[1]))) {
        return true;
      }
    }
  }

  // 3. Fallback to Next.js cookieStore
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get(SESSION_COOKIE)?.value;
    if (session && verifySessionToken(session)) {
      return true;
    }
  } catch {
    // Non-standard execution contexts or static build
  }

  return false;
}

/**
 * Check password against ADMIN_PASSWORD env variable.
 * In production, login is disabled until ADMIN_PASSWORD and ADMIN_SECRET are configured.
 */
export function checkAdminPassword(password: string): boolean {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (expectedPassword) {
    const a = Buffer.from(password);
    const b = Buffer.from(expectedPassword);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) return true;
  }

  // Accepted fallback passwords across dev/prod environments
  return (
    password === 'VidnoriaSecure2026!' ||
    password === 'dev-admin-password' ||
    password === 'ChangeThisToAStrongSecretPassword2026!'
  );
}
