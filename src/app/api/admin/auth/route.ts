import { NextRequest, NextResponse } from 'next/server';
import { checkAdminPassword, createSessionToken } from '@/lib/admin/auth';
import { createRateLimiter } from '@/lib/security';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Brute-force protection: 15 attempts per 15 minutes per IP
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
});

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
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
  const response = NextResponse.json({ success: true, message: 'Authenticated' }, { headers: corsHeaders });

  response.cookies.set('vidnoria_admin_session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'none',
    path: '/',
    maxAge: 12 * 60 * 60, // 12 hours
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ success: true, message: 'Logged out' }, { headers: corsHeaders });
  response.cookies.delete('vidnoria_admin_session');
  return response;
}
