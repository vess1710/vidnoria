import { NextRequest, NextResponse } from 'next/server';
import {
  checkAdminPassword,
  createSessionToken,
  getAdminCorsHeaders,
  adminOptionsResponse,
} from '@/lib/admin/auth';
import { createRateLimiter } from '@/lib/security';

// Brute-force protection: 15 attempts per 15 minutes per IP
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
});

export async function OPTIONS(req: Request) {
  return adminOptionsResponse(req);
}

export async function POST(req: NextRequest) {
  const corsHeaders = getAdminCorsHeaders(req);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const rate = loginLimiter.check(ip);

  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
      { status: 429, headers: corsHeaders }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.password) {
    return NextResponse.json({ success: false, error: 'Password required' }, { status: 400, headers: corsHeaders });
  }

  if (!checkAdminPassword(body.password)) {
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401, headers: corsHeaders });
  }

  const token = createSessionToken();
  const response = NextResponse.json(
    { success: true, message: 'Authenticated', token },
    { headers: corsHeaders }
  );

  const isHttps = req.nextUrl.protocol === 'https:' || req.headers.get('x-forwarded-proto') === 'https';

  response.cookies.set('vidnoria_admin_session', token, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'none' : 'lax',
    path: '/',
    maxAge: 12 * 60 * 60, // 12 hours
  });

  return response;
}

export async function DELETE(req: Request) {
  const corsHeaders = getAdminCorsHeaders(req);
  const response = NextResponse.json({ success: true, message: 'Logged out' }, { headers: corsHeaders });
  response.cookies.delete('vidnoria_admin_session');
  return response;
}
