'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, AlertCircle, Loader2, Server, ExternalLink } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/client-api';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tunnelUrl, setTunnelUrl] = useState<string | null>(null);
  const router = useRouter();

  const isStaticHosting = typeof window !== 'undefined' && (
    window.location.hostname.endsWith('vidnoria.com') ||
    window.location.hostname.endsWith('github.io')
  );

  useEffect(() => {
    getApiBaseUrl().then((url) => {
      if (url && url !== '') {
        setTunnelUrl(url.replace(/\/+$/, ''));
      }
    }).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setError('');
    setLoading(true);

    const trimmedPassword = password.trim();

    // 1. Try server-side API auth (local Node.js or same origin)
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: trimmedPassword }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          sessionStorage.setItem('vidnoria_admin_auth', 'true');
          router.push('/admin/dashboard');
          return;
        } else {
          setError(data.error || 'Şifre hatalı. Lütfen tekrar deneyin.');
          setLoading(false);
          return;
        }
      }
    } catch {
      // Server-side API unreachable on static host
    }

    // 2. Try remote Cloudflare Tunnel API if detected
    if (tunnelUrl) {
      try {
        const res = await fetch(`${tunnelUrl}/api/admin/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: trimmedPassword }),
        });
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = await res.json();
          if (data.success) {
            sessionStorage.setItem('vidnoria_admin_auth', 'true');
            router.push('/admin/dashboard');
            return;
          }
        }
      } catch {
        // Tunnel API unreachable
      }
    }

    // 3. Static Client-Side Authentication Fallback
    // Allows administrator login directly from static hosting (GitHub Pages)
    const validPasswords = [
      'VidnoriaSecure2026!',
      'dev-admin-password',
      'ChangeThisToAStrongSecretPassword2026!',
    ];

    if (validPasswords.includes(trimmedPassword)) {
      sessionStorage.setItem('vidnoria_admin_auth', 'true');
      router.push('/admin/dashboard');
      return;
    }

    setError('Şifre hatalı. Lütfen geçerli yönetici şifresini girin.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md glass-card p-8 md:p-10 shadow-2xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/logo.svg"
              alt="Vidnoria"
              width={160}
              height={40}
              className="h-10 w-auto dark:hidden"
            />
            <Image
              src="/images/logo-dark.svg"
              alt="Vidnoria"
              width={160}
              height={40}
              className="h-10 w-auto hidden dark:block"
            />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Yönetim Paneli Girişi
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Yetkili personel için şifre korumalı erişim
          </p>
        </div>

        {isStaticHosting && tunnelUrl && (
          <div className="mb-6 p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-foreground space-y-2">
            <p className="font-semibold text-primary flex items-center gap-1.5">
              <Server className="w-4 h-4 shrink-0" />
              Aktif Node.js Yönetim Sunucusu Tespit Edildi
            </p>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              Vidnoria web arayüzü statik CDN üzerinde yayınlandığından, oturum güvenliği gereği yönetim paneli ve SEO Manager aktif Node.js sunucunuz üzerinden çalışmaktadır:
            </p>
            <a
              href={`${tunnelUrl}/admin`}
              className="mt-2 w-full gradient-bg text-white font-semibold py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 hover:opacity-95 transition-all text-xs"
            >
              <span>Aktif Yönetim Paneline Git</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-xs mb-6 animate-slide-up space-y-2">
            <div className="flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {tunnelUrl && (
              <a
                href={`${tunnelUrl}/admin`}
                className="inline-flex items-center gap-1 text-primary font-bold hover:underline text-[11px]"
              >
                <span>{tunnelUrl}/admin adresine git</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-1.5 text-foreground">
              Yönetici Şifresi
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••••••"
                className="w-full ps-10 pe-4 py-3 rounded-xl border border-border bg-card/60 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Lock className="w-4 h-4 text-muted-foreground absolute start-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full gradient-bg text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Giriş Yap</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
