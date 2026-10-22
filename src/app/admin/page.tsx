'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          sessionStorage.setItem('vidnoria_admin_auth', 'true');
          router.push('/admin/dashboard');
          return;
        } else {
          setError(data.error || 'Authentication failed');
          return;
        }
      }
    } catch {
      // Static host fallback below
    }

    // Fallback for static hosting (GitHub Pages)
    if (password === 'VidnoriaSecure2026!') {
      sessionStorage.setItem('vidnoria_admin_auth', 'true');
      router.push('/admin/dashboard');
    } else {
      setError('Geçersiz yönetici şifresi.');
    }
    setLoading(false);
    return;
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

        {error && (
          <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive text-sm mb-6 animate-slide-up">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
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
