'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, Settings, DollarSign, Globe, FileText, 
  LogOut, Activity, Cpu, HardDrive, CheckCircle2, AlertTriangle, 
  Save, Trash2, Plus, Edit, Loader2, ExternalLink, HelpCircle
} from 'lucide-react';
import { SiteSettings } from '@/types';

type Tab = 'overview' | 'settings' | 'ads' | 'platforms' | 'blog';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [blogPosts, setBlogPosts] = useState<any[]>([]);

  // Blog post editor modal state
  const [editingPost, setEditingPost] = useState<any | null>(null);

  const router = useRouter();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [statsRes, settingsRes, blogRes] = await Promise.all([
        fetch('/api/admin/stats').catch(() => null),
        fetch('/api/admin/settings').catch(() => null),
        fetch('/api/admin/blog').catch(() => null),
      ]);

      const isJson = statsRes?.headers.get('content-type')?.includes('application/json');

      if (isJson && statsRes && settingsRes && blogRes) {
        if (statsRes.status === 401 || settingsRes.status === 401) {
          router.push('/admin');
          return;
        }

        const statsData = await statsRes.json();
        const settingsData = await settingsRes.json();
        const blogData = await blogRes.json();

        if (statsData.success) setStats(statsData.stats);
        if (settingsData.success) setSettings(settingsData.settings);
        if (blogData.success) setBlogPosts(blogData.posts || []);
        return;
      }

      // Static hosting (GitHub Pages) fallback using sessionStorage & localStorage
      if (typeof window !== 'undefined' && sessionStorage.getItem('vidnoria_admin_auth') !== 'true') {
        router.push('/admin');
        return;
      }

      setStats({
        uptimeSeconds: 3600,
        cpus: 4,
        memory: { usedPercent: 24, freeMB: 6144, totalMB: 8192 },
        tools: { ffmpeg: true, ytdlp: true },
        analytics: { message: 'Google Analytics 4 yapılandırmaya hazır.' },
      });

      const defaultSlots = [
        { id: 'left-sidebar-ad', name: 'Sol Dikey Reklam (160×600)', position: 'sidebar' as const, slotId: '', format: 'vertical' as const, enabled: true },
        { id: 'right-sidebar-ad', name: 'Sağ Dikey Reklam (160×600)', position: 'sidebar' as const, slotId: '', format: 'vertical' as const, enabled: true },
        { id: 'home-top-banner', name: 'Ana Sayfa Üst Banner (728×90)', position: 'header' as const, slotId: '', format: 'horizontal' as const, enabled: true },
        { id: 'home-mid-banner', name: 'Ana Sayfa Orta Banner (728×90)', position: 'content' as const, slotId: '', format: 'horizontal' as const, enabled: true },
        { id: 'download-top-ad', name: 'İndirme Sayfası Üst Banner (728×90)', position: 'download' as const, slotId: '', format: 'horizontal' as const, enabled: true },
        { id: 'blog-top-ad', name: 'Blog Sayfası Reklam Alanı', position: 'blog' as const, slotId: '', format: 'auto' as const, enabled: true },
      ];

      const savedSettings = typeof window !== 'undefined' ? localStorage.getItem('vidnoria_settings') : null;
      const parsed = savedSettings ? JSON.parse(savedSettings) : null;
      const hasCurrentSlots = parsed?.ads?.slots?.some((s: any) => s.id === 'home-top-banner');

      setSettings(
        parsed && hasCurrentSlots
          ? parsed
          : {
              siteName: parsed?.siteName || 'Vidnoria',
              siteDescription: { tr: 'Ücretsiz Video ve Müzik İndirme Platformu' },
              logo: parsed?.logo || '/images/logo.svg',
              favicon: '/images/favicon.svg',
              contactEmail: parsed?.contactEmail || 'contact@vidnoria.com',
              socialLinks: {},
              seo: parsed?.seo || { defaultTitle: {}, defaultDescription: {}, googleAnalyticsId: '' },
              ads: {
                enabled: true,
                adsensePublisherId: parsed?.ads?.adsensePublisherId || '',
                slots: defaultSlots,
              },
              platforms: parsed?.platforms || {
                youtube: { enabled: true },
                instagram: { enabled: true },
                tiktok: { enabled: true },
                facebook: { enabled: true },
                twitter: { enabled: true },
              },
            }
      );
    } catch {
      setMessage({ type: 'error', text: 'Veriler yüklenirken hata oluştu.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);

    if (typeof window !== 'undefined') {
      localStorage.setItem('vidnoria_settings', JSON.stringify(settings));
      window.dispatchEvent(new Event('storage'));
    }

    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi! "Siteyi Göster" butonuna tıklayarak anında görebilirsiniz.' });
        } else {
          setMessage({ type: 'error', text: data.error || 'Kaydedilemedi.' });
        }
        return;
      }
    } catch {
      // Static fallback
    } finally {
      setMessage({ type: 'success', text: 'Ayarlar başarıyla kaydedildi! "Siteyi Göster" butonuna tıklayarak anında görebilirsiniz.' });
      setSaving(false);
    }
  };

  const handleSaveBlogPost = async () => {
    if (!editingPost || !editingPost.slug) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingPost),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: 'success', text: 'Yazı kaydedildi.' });
        setEditingPost(null);
        fetchInitialData();
      }
    } catch {
      setMessage({ type: 'error', text: 'Yazı kaydedilemedi.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlogPost = async (slug: string) => {
    if (!confirm(`"${slug}" yazısını silmek istediğinize emin misiniz?`)) return;
    try {
      const res = await fetch(`/api/admin/blog?slug=${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setMessage({ type: 'success', text: 'Yazı silindi.' });
        fetchInitialData();
      }
    } catch {
      setMessage({ type: 'error', text: 'Silme işlemi başarısız.' });
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-r border-border bg-card p-6 flex flex-col">
        <div className="mb-8 flex items-center justify-between">
          <Image
            src="/images/logo.svg"
            alt="Vidnoria"
            width={120}
            height={32}
            className="h-7 w-auto dark:hidden"
          />
          <Image
            src="/images/logo-dark.svg"
            alt="Vidnoria"
            width={120}
            height={32}
            className="h-7 w-auto hidden dark:block"
          />
        </div>

        <nav className="space-y-1.5 flex-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'overview' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Genel Bakış</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'settings' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Site Ayarları</span>
          </button>

          <button
            onClick={() => setActiveTab('ads')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'ads' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>AdSense & Reklam</span>
          </button>

          <button
            onClick={() => setActiveTab('platforms')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'platforms' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>Platformlar</span>
          </button>

          <button
            onClick={() => setActiveTab('blog')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              activeTab === 'blog' ? 'bg-primary text-white' : 'text-muted-foreground hover:bg-accent'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Blog Yazıları</span>
          </button>
        </nav>

        <div className="pt-6 border-t border-border mt-auto space-y-2">
          <Link
            href="/tr"
            target="_blank"
            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl text-sm font-semibold gradient-bg text-white shadow-md hover:opacity-95 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Siteyi Göster</span>
          </Link>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Çıkış Yap</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 overflow-y-auto max-w-5xl">
        {/* Top Quick Bar */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div className="text-xs text-muted-foreground">
            Vidnoria Yönetim Paneli • Yaptığınız değişiklikleri kaydettikten sonra anında görüntüleyebilirsiniz.
          </div>
          <Link
            href="/tr"
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Siteyi Göster (Yeni Sekme)</span>
          </Link>
        </div>
        {message && (
          <div
            className={`p-4 rounded-xl text-sm mb-6 flex items-center gap-2 ${
              message.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'bg-destructive/10 text-destructive border border-destructive/20'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            <span>{message.text}</span>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            <h1 className="text-2xl font-bold tracking-tight">Sistem Durumu & Genel Bakış</h1>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-5">
                <div className="flex items-center gap-3 text-muted-foreground mb-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold">Çalışma Süresi</span>
                </div>
                <div className="text-2xl font-bold">{Math.round((stats?.uptimeSeconds || 0) / 60)} dk</div>
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center gap-3 text-muted-foreground mb-2">
                  <Cpu className="w-4 h-4 text-purple-500" />
                  <span className="text-xs font-semibold">CPU Çekirdekleri</span>
                </div>
                <div className="text-2xl font-bold">{stats?.cpus || 1}</div>
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center gap-3 text-muted-foreground mb-2">
                  <HardDrive className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-semibold">Bellek Kullanımı</span>
                </div>
                <div className="text-2xl font-bold">{stats?.memory?.usedPercent || 0}%</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Boş: {stats?.memory?.freeMB || 0} MB / {stats?.memory?.totalMB || 0} MB
                </div>
              </div>

              <div className="glass-card p-5">
                <div className="flex items-center gap-3 text-muted-foreground mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-semibold">Depolama</span>
                </div>
                <div className="text-2xl font-bold">JSON / MD</div>
                <div className="text-xs text-emerald-500 mt-1">Veritabanısız (Aktif)</div>
              </div>
            </div>

            {/* Tool Dependencies Check */}
            <div className="glass-card p-6">
              <h2 className="text-lg font-bold mb-4">Medya İşleme Servisleri</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/40">
                  <span className="font-medium text-sm">FFmpeg (Ses/Video Dönüştürücü)</span>
                  <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                    stats?.tools?.ffmpeg ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {stats?.tools?.ffmpeg ? 'Kullanılabilir' : 'Sunucu Paketinde Yok'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/40">
                  <span className="font-medium text-sm">yt-dlp (Medya Ayıklayıcı)</span>
                  <span className={`text-xs px-2.5 py-1 rounded-md font-semibold ${
                    stats?.tools?.ytdlp ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                  }`}>
                    {stats?.tools?.ytdlp ? 'Kullanılabilir' : 'Sunucu Paketinde Yok'}
                  </span>
                </div>
              </div>
            </div>

            {/* GA4 Notice */}
            <div className="glass-card p-6 border-primary/20 bg-primary/5">
              <h3 className="text-base font-bold text-foreground mb-1">Google Analytics 4</h3>
              <p className="text-sm text-muted-foreground mb-2">
                {stats?.analytics?.message}
              </p>
              <p className="text-xs text-muted-foreground">
                Ziyaretçi trafiği için <code>GA4_MEASUREMENT_ID</code> ortam değişkenini veya Site Ayarları menüsünü yapılandırabilirsiniz.
              </p>
            </div>
          </div>
        )}

        {/* Site Settings Tab */}
        {activeTab === 'settings' && settings && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Site Ayarları</h1>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Kaydediliyor...' : 'Değişiklikleri Kaydet'}</span>
              </button>
            </div>

            <div className="glass-card p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Site Adı</label>
                <input
                  type="text"
                  value={settings.siteName}
                  onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-card/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">İletişim E-Postası</label>
                <input
                  type="email"
                  value={settings.contactEmail}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-card/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Logo URL</label>
                <input
                  type="text"
                  value={settings.logo}
                  onChange={(e) => setSettings({ ...settings, logo: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-card/50 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">Google Analytics Ölçüm Kimliği (G-XXXXX)</label>
                <input
                  type="text"
                  value={settings.seo?.googleAnalyticsId || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      seo: { ...settings.seo, googleAnalyticsId: e.target.value },
                    })
                  }
                  placeholder="G-..."
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-card/50 text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* AdSense Tab */}
        {activeTab === 'ads' && settings && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Google AdSense Yönetimi</h1>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Kaydediliyor...' : 'Reklam Ayarlarını Kaydet'}</span>
              </button>
            </div>

            <div className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-border">
                <div>
                  <div className="font-semibold text-sm">AdSense Reklamlarını Etkinleştir</div>
                  <div className="text-xs text-muted-foreground">Tüm sitedeki AdSense alanlarını tek tuşla açın/kapatın</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.ads.enabled}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ads: { ...settings.ads, enabled: e.target.checked },
                    })
                  }
                  className="w-5 h-5 rounded text-primary focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">AdSense Publisher ID (Yayıncı Kimliği)</label>
                <input
                  type="text"
                  placeholder="pub-1234567890123456"
                  value={settings.ads.adsensePublisherId || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ads: { ...settings.ads, adsensePublisherId: e.target.value },
                    })
                  }
                  className="w-full px-3.5 py-2 rounded-xl border border-border bg-card/50 text-sm"
                />
              </div>

              <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1.5">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-primary" />
                  <span>Publisher ID ve Slot ID (Reklam Birimi Kodu) Nedir?</span>
                </div>
                <p>
                  • <strong>Publisher ID (Yayıncı Kimliği):</strong> Google AdSense hesabınızın genel numarasıdır (Örn: <code>pub-1234567890123456</code>).
                </p>
                <p>
                  • <strong>Slot ID (Reklam Birimi Kodu):</strong> Google AdSense panelinde <em>Reklamlar → Reklam Birimine Göre</em> menüsünden her bir kutu için oluşturduğunuz reklamın <strong>10 haneli özel numarasıdır</strong> (Örn: <code>9876543210</code>). Boş bırakırsanız sitede şık "Sponsorlu Reklam Alanı" kutusu görünür; kodu girdiğinizde gerçek Google reklamı çıkar. Yanındaki kutucuktan istediğiniz reklam alanını tek tıkla kapatıp açabilirsiniz.
                </p>
              </div>

              <div className="pt-2">
                <h3 className="font-bold text-sm mb-3">Reklam Alanları (Slots)</h3>
                <div className="space-y-3">
                  {settings.ads.slots?.map((slot, idx) => (
                    <div key={slot.id} className="p-3.5 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/40">
                      <div>
                        <div className="font-semibold text-sm">{slot.name}</div>
                        <div className="text-xs text-muted-foreground">Konum: {slot.position} • Boyut/Format: {slot.format}</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="Reklam Birimi Kodu (Örn: 1234567890)"
                          value={slot.slotId}
                          onChange={(e) => {
                            const newSlots = [...settings.ads.slots];
                            newSlots[idx].slotId = e.target.value;
                            setSettings({ ...settings, ads: { ...settings.ads, slots: newSlots } });
                          }}
                          className="px-3 py-1.5 text-xs border border-border rounded-lg bg-background w-60"
                        />
                        <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer shrink-0">
                          <input
                            type="checkbox"
                            checked={slot.enabled}
                            onChange={(e) => {
                              const newSlots = [...settings.ads.slots];
                              newSlots[idx].enabled = e.target.checked;
                              setSettings({ ...settings, ads: { ...settings.ads, slots: newSlots } });
                            }}
                            className="w-4 h-4 rounded text-primary"
                          />
                          <span>{slot.enabled ? 'Açık' : 'Kapalı'}</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Platforms Tab */}
        {activeTab === 'platforms' && settings && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Desteklenen Platformlar</h1>
              <button
                onClick={handleSaveSettings}
                disabled={saving}
                className="gradient-bg text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Platformları Güncelle</span>
              </button>
            </div>

            <div className="glass-card p-6 space-y-4">
              {(['youtube', 'instagram', 'tiktok', 'facebook', 'twitter'] as const).map((plat) => {
                const isEnabled = settings.platforms?.[plat]?.enabled ?? true;
                return (
                  <div key={plat} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/40">
                    <span className="font-semibold text-sm capitalize">{plat}</span>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-xs text-muted-foreground">{isEnabled ? 'Aktif' : 'Devre Dışı'}</span>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          setSettings({
                            ...settings,
                            platforms: {
                              ...settings.platforms,
                              [plat]: { enabled: e.target.checked },
                            },
                          });
                        }}
                        className="w-5 h-5 rounded text-primary focus:ring-primary"
                      />
                    </label>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Blog Tab */}
        {activeTab === 'blog' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold tracking-tight">Blog Yazıları</h1>
              <button
                onClick={() =>
                  setEditingPost({
                    slug: 'yeni-yazi-' + Date.now().toString(36),
                    frontmatter: {
                      title: { tr: '', en: '', ar: '' },
                      description: { tr: '', en: '', ar: '' },
                      category: 'guides',
                      status: 'published',
                      publishedAt: new Date().toISOString().split('T')[0],
                    },
                    content: '<!-- content:tr -->\n# Başlık\n\nİçerik buraya...',
                  })
                }
                className="gradient-bg text-white px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Yazı Ekle</span>
              </button>
            </div>

            <div className="glass-card divide-y divide-border">
              {blogPosts.map((post) => (
                <div key={post.slug} className="p-4 flex items-center justify-between hover:bg-accent/20 transition-colors">
                  <div>
                    <div className="font-bold text-sm">
                      {post.frontmatter?.title?.tr || post.frontmatter?.title?.en || post.slug}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <span>/{post.slug}</span>
                      <span>•</span>
                      <span className="capitalize">{post.frontmatter?.category}</span>
                      <span>•</span>
                      <span>{post.frontmatter?.publishedAt}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingPost(post)}
                      className="p-2 rounded-lg hover:bg-accent text-primary"
                      title="Düzenle"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteBlogPost(post.slug)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-destructive"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Post Edit Modal */}
            {editingPost && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
                  <h2 className="text-lg font-bold">Yazı Düzenle: {editingPost.slug}</h2>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Slug</label>
                    <input
                      type="text"
                      value={editingPost.slug}
                      onChange={(e) => setEditingPost({ ...editingPost, slug: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-card/60 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Başlık (Türkçe)</label>
                    <input
                      type="text"
                      value={editingPost.frontmatter?.title?.tr || ''}
                      onChange={(e) =>
                        setEditingPost({
                          ...editingPost,
                          frontmatter: {
                            ...editingPost.frontmatter,
                            title: { ...editingPost.frontmatter.title, tr: e.target.value },
                          },
                        })
                      }
                      className="w-full px-3.5 py-2 rounded-xl border border-border bg-card/60 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold mb-1">Markdown İçeriği</label>
                    <textarea
                      rows={10}
                      value={editingPost.content || ''}
                      onChange={(e) => setEditingPost({ ...editingPost, content: e.target.value })}
                      className="w-full p-3 font-mono text-xs rounded-xl border border-border bg-card/60 resize-y"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-3">
                    <button
                      onClick={() => setEditingPost(null)}
                      className="px-4 py-2 rounded-xl border border-border text-sm font-semibold hover:bg-accent"
                    >
                      İptal
                    </button>
                    <button
                      onClick={handleSaveBlogPost}
                      disabled={saving}
                      className="gradient-bg text-white px-5 py-2 rounded-xl text-sm font-semibold"
                    >
                      {saving ? 'Kaydediliyor...' : 'Yazıyı Kaydet'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
