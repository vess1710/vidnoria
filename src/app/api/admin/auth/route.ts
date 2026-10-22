import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword, createSessionToken } from '@/lib/admin/auth';
import { createRateLimiter } from '@/lib/security';

// Brute-force protection: 5 attempts per 15 minutes per IP
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
});

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
  const rate = loginLimiter.check(ip);

  if (!rate.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many login attempts. Please try again in 15 minutes.' },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.password) {
    return NextResponse.json({ success: false, error: 'Password required' }, { status: 400 });
  }

  if (!checkAdminPassword(body.password)) {
    return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
  }

  const token = createSessionToken();
  const response = NextResponse.json({ success: true, message: 'Authenticated' });

  response.cookies.set('vidnoria_admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 12 * 60 * 60, // 12 hours
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logged out' });
  response.cookies.delete('vidnoria_admin_session');
  return response;
}
