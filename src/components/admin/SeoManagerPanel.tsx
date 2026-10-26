'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles, RefreshCw, Check, X, Undo2,
  Globe, Smartphone, Laptop, ArrowUpRight,
  Loader2, GitPullRequest, Info
} from 'lucide-react';
import { Locale } from '@/lib/i18n';
import {
  GscAnalyticsPayload,
  SeoApprovalRequest,
  SeoAuditReport,
  SeoContentDraft,
  SeoDateRange,
  SeoKeywordItem,
} from '@/lib/seo/types';

interface SeoManagerPanelProps {
  onNotify: (msg: { type: 'success' | 'error'; text: string }) => void;
}

interface CuratedTopic {
  id: string;
  category: string;
  topic: Record<Locale, string>;
  expectedBenefit: Record<Locale, string>;
}

interface GitHubPrDraftModal {
  branchName: string;
  commitMessage: string;
  title: string;
  body: string;
  modifiedFiles: Array<{ path: string; changeSummary: string }>;
}

type SubTab = 'overview' | 'audit' | 'gsc' | 'keywords' | 'content' | 'approvals';

export default function SeoManagerPanel({ onNotify }: SeoManagerPanelProps) {
  const [uiLocale, setUiLocale] = useState<Locale>('tr');
  const [activeTab, setActiveTab] = useState<SubTab>('overview');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Core Data States
  const [auditReport, setAuditReport] = useState<SeoAuditReport | null>(null);
  const [gscData, setGscData] = useState<GscAnalyticsPayload | null>(null);
  const [keywords, setKeywords] = useState<SeoKeywordItem[]>([]);
  const [approvals, setApprovals] = useState<SeoApprovalRequest[]>([]);
  const [drafts, setDrafts] = useState<SeoContentDraft[]>([]);
  const [curatedTopics, setCuratedTopics] = useState<CuratedTopic[]>([]);

  // Filters
  const [gscRange, setGscRange] = useState<SeoDateRange>('28d');
  const [gscDemoToggle, setGscDemoToggle] = useState<boolean>(true);
  const [auditSeverityFilter, setAuditSeverityFilter] = useState<'all' | 'critical' | 'warning' | 'suggestion'>('all');
  const [keywordCategoryFilter, setKeywordCategoryFilter] = useState<string>('all');
  const [selectedPrModal, setSelectedPrModal] = useState<GitHubPrDraftModal | null>(null);

  const isRtl = uiLocale === 'ar';

  const t = {
    tr: {
      title: 'Vidnoria SEO Manager',
      subtitle: 'Google Arama Görünürlüğü ve Profesyonel SEO Otomasyonu',
      demoBadge: 'DEMO / ÖRNEK VERİ MODU',
      liveBadge: 'CANLI SEARCH CONSOLE VERİSİ',
      tabOverview: 'Genel Bakış',
      tabAudit: 'Teknik Denetim',
      tabGsc: 'Search Console',
      tabKeywords: 'Anahtar Kelimeler',
      tabContent: 'İçerik Yöneticisi',
      tabApprovals: 'Onay Bekleyenler',
      runAuditBtn: 'Teknik Denetim Başlat',
      runPsiBtn: 'PageSpeed Ölçümü Yap',
      healthScore: 'SEO Sağlık Skoru',
      totalClicks: 'Google Toplam Tıklama',
      totalImpressions: 'Toplam Gösterim',
      avgCtr: 'Ortalama CTR',
      avgPosition: 'Ortalama Sıralama',
      pendingApprovals: 'Onay Bekleyen İşlem',
      criticalIssues: 'Kritik SEO Hataları',
      warnings: 'SEO Uyarıları',
      approveBtn: 'Onayla & Uygula',
      rejectBtn: 'Reddet',
      rollbackBtn: 'Geri Al',
      viewPrBtn: 'GitHub PR Taslağı',
      emptyApprovals: 'Harika! Onay bekleyen hiçbir bekleyen SEO işlemi yok.',
    },
    en: {
      title: 'Vidnoria SEO Manager',
      subtitle: 'Google Search Visibility & Professional SEO Automation',
      demoBadge: 'DEMO / SAMPLE DATA MODE',
      liveBadge: 'LIVE SEARCH CONSOLE DATA',
      tabOverview: 'Overview',
      tabAudit: 'Technical Audit',
      tabGsc: 'Search Console',
      tabKeywords: 'Keywords',
      tabContent: 'Content Manager',
      tabApprovals: 'Approvals Queue',
      runAuditBtn: 'Run Technical Audit',
      runPsiBtn: 'Run PageSpeed Audit',
      healthScore: 'SEO Health Score',
      totalClicks: 'Google Total Clicks',
      totalImpressions: 'Total Impressions',
      avgCtr: 'Average CTR',
      avgPosition: 'Average Position',
      pendingApprovals: 'Pending Approvals',
      criticalIssues: 'Critical SEO Issues',
      warnings: 'SEO Warnings',
      approveBtn: 'Approve & Apply',
      rejectBtn: 'Reject',
      rollbackBtn: 'Rollback',
      viewPrBtn: 'GitHub PR Draft',
      emptyApprovals: 'Great! No pending SEO changes requiring review.',
    },
    ar: {
      title: 'مدير السيو فيدنوريا (SEO Manager)',
      subtitle: 'أتمتة وتحسين الظهور في محرك بحث Google باحترافية',
      demoBadge: 'وضع المعاينة / بيانات تجريبية',
      liveBadge: 'بيانات Search Console المباشرة',
      tabOverview: 'نظرة عامة',
      tabAudit: 'الفحص التقني',
      tabGsc: 'Search Console',
      tabKeywords: 'الكلمات المفتاحية',
      tabContent: 'إدارة المحتوى',
      tabApprovals: 'الموافقات المعلقة',
      runAuditBtn: 'بدء الفحص التقني',
      runPsiBtn: 'فحص PageSpeed',
      healthScore: 'درجة صحة السيو',
      totalClicks: 'إجمالي النقرات',
      totalImpressions: 'إجمالي الظهور',
      avgCtr: 'معدل النقر (CTR)',
      avgPosition: 'متوسط الترتيب',
      pendingApprovals: 'معاملات بانتظار الموافقة',
      criticalIssues: 'أخطاء سيو حرجة',
      warnings: 'تحذيرات السيو',
      approveBtn: 'موافقة وتطبيق',
      rejectBtn: 'رفض',
      rollbackBtn: 'تراجع',
      viewPrBtn: 'مسودة GitHub PR',
      emptyApprovals: 'رائع! لا توجد تعديلات سيو معلقة بانتظار المراجعة.',
    },
  }[uiLocale];

  const fetchAllSeoData = async () => {
    try {
      const [auditRes, gscRes, kwRes, appRes, contRes] = await Promise.all([
        fetch('/api/admin/seo/audit').catch(() => null),
        fetch(`/api/admin/seo/gsc?range=${gscRange}&demo=${gscDemoToggle}`).catch(() => null),
        fetch('/api/admin/seo/keywords').catch(() => null),
        fetch('/api/admin/seo/approvals').catch(() => null),
        fetch('/api/admin/seo/content').catch(() => null),
      ]);

      if (auditRes?.ok) {
        const d = await auditRes.json();
        if (d.success) setAuditReport(d.report);
      }
      if (gscRes?.ok) {
        const d = await gscRes.json();
        if (d.success) setGscData(d.analytics);
      }
      if (kwRes?.ok) {
        const d = await kwRes.json();
        if (d.success) setKeywords(d.keywords || []);
      }
      if (appRes?.ok) {
        const d = await appRes.json();
        if (d.success) setApprovals(d.items || []);
      }
      if (contRes?.ok) {
        const d = await contRes.json();
        if (d.success) {
          setDrafts(d.drafts || []);
          setCuratedTopics(d.curatedSuggestions || []);
        }
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onNotify({ type: 'error', text: 'SEO verileri yüklenirken hata oluştu: ' + msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    async function loadData() {
      try {
        const [auditRes, gscRes, kwRes, appRes, contRes] = await Promise.all([
          fetch('/api/admin/seo/audit').catch(() => null),
          fetch(`/api/admin/seo/gsc?range=${gscRange}&demo=${gscDemoToggle}`).catch(() => null),
          fetch('/api/admin/seo/keywords').catch(() => null),
          fetch('/api/admin/seo/approvals').catch(() => null),
          fetch('/api/admin/seo/content').catch(() => null),
        ]);

        if (ignore) return;

        if (auditRes?.ok) {
          const d = await auditRes.json();
          if (d.success) setAuditReport(d.report);
        }
        if (gscRes?.ok) {
          const d = await gscRes.json();
          if (d.success) setGscData(d.analytics);
        }
        if (kwRes?.ok) {
          const d = await kwRes.json();
          if (d.success) setKeywords(d.keywords || []);
        }
        if (appRes?.ok) {
          const d = await appRes.json();
          if (d.success) setApprovals(d.items || []);
        }
        if (contRes?.ok) {
          const d = await contRes.json();
          if (d.success) {
            setDrafts(d.drafts || []);
            setCuratedTopics(d.curatedSuggestions || []);
          }
        }
      } catch (e: unknown) {
        if (!ignore) {
          const msg = e instanceof Error ? e.message : String(e);
          onNotify({ type: 'error', text: 'SEO verileri yüklenirken hata oluştu: ' + msg });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [gscRange, gscDemoToggle, onNotify]);

  const handleRunAudit = async (includePageSpeed = false) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/seo/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includePageSpeed }),
      });
      const data = await res.json();
      if (data.success) {
        setAuditReport(data.report);
        onNotify({ type: 'success', text: `Teknik denetim tamamlandı! Sağlık Skoru: %${data.report.healthScore}` });
        fetchAllSeoData();
      } else {
        onNotify({ type: 'error', text: data.error || 'Denetim çalıştırılamadı.' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onNotify({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprovalAction = async (approvalId: string, action: 'approve' | 'reject' | 'rollback') => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/seo/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approvalId, action }),
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'approve') {
          onNotify({ type: 'success', text: 'Değişiklik onaylandı ve başarıyla uygulandı!' });
          if (data.prDraft) setSelectedPrModal(data.prDraft);
        } else if (action === 'reject') {
          onNotify({ type: 'success', text: 'Değişiklik önerisi reddedildi.' });
        } else if (action === 'rollback') {
          onNotify({ type: 'success', text: 'Değişiklik başarıyla önceki haline geri alındı.' });
        }
        fetchAllSeoData();
      } else {
        onNotify({ type: 'error', text: data.error || 'İşlem başarısız.' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onNotify({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateDraft = async (topicId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/seo/content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topicId }),
      });
      const data = await res.json();
      if (data.success) {
        onNotify({
          type: 'success',
          text: `Yeni 3 dilli blog taslağı oluşturuldu ve Onay Kuyruğuna eklendi: "${data.draft.title.tr}"`,
        });
        setActiveTab('approvals');
        fetchAllSeoData();
      } else {
        onNotify({ type: 'error', text: data.error || 'Taslak oluşturulamadı.' });
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      onNotify({ type: 'error', text: msg });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !auditReport) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Vidnoria SEO Manager yükleniyor...</p>
      </div>
    );
  }

  const pendingList = approvals.filter(a => a.status === 'pending');
  const filteredIssues =
    auditReport?.issues.filter(i => (auditSeverityFilter === 'all' ? true : i.severity === auditSeverityFilter)) || [];
  const filteredKeywords =
    keywords.filter(k => (keywordCategoryFilter === 'all' ? true : k.category === keywordCategoryFilter)) || [];

  return (
    <div className="space-y-6" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header & Sub-Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">{t.title}</h1>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-bold border ${
                gscData?.isDemoMode
                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30'
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              }`}
            >
              {gscData?.isDemoMode ? t.demoBadge : t.liveBadge}
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t.subtitle}</p>
        </div>

        {/* UI Language Switcher */}
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <div className="inline-flex rounded-xl border border-border p-1 bg-card/60 text-xs">
            {(['tr', 'en', 'ar'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setUiLocale(lang)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  uiLocale === lang ? 'bg-primary text-white font-bold' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {lang.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={() => handleRunAudit(false)}
            disabled={actionLoading}
            className="gradient-bg text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm hover:opacity-95"
          >
            {actionLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            <span>{t.runAuditBtn}</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border text-xs sm:text-sm">
        {[
          { key: 'overview', label: t.tabOverview },
          { key: 'audit', label: `${t.tabAudit} (${auditReport?.issues.length || 0})` },
          { key: 'gsc', label: t.tabGsc },
          { key: 'keywords', label: `${t.tabKeywords} (${keywords.length})` },
          { key: 'content', label: t.tabContent },
          { key: 'approvals', label: `${t.tabApprovals} (${pendingList.length})` },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as SubTab)}
            className={`px-3.5 py-2 rounded-xl font-medium transition-all shrink-0 ${
              activeTab === tab.key
                ? 'bg-primary text-white font-bold shadow-sm'
                : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5">
              <div className="text-xs text-muted-foreground font-semibold mb-1">{t.healthScore}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black text-emerald-500">%{auditReport?.healthScore ?? 100}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
              <div className="w-full bg-muted/40 h-1.5 rounded-full mt-2.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${auditReport?.healthScore ?? 100}%` }}
                />
              </div>
            </div>

            <div className="glass-card p-5">
              <div className="text-xs text-muted-foreground font-semibold mb-1">{t.totalClicks}</div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black">{gscData?.summary?.clicks?.toLocaleString() ?? '—'}</span>
                {gscData?.summary?.clicksDeltaPercent !== undefined && (
                  <span className="text-xs text-emerald-500 font-bold inline-flex items-center">
                    <ArrowUpRight className="w-3 h-3" />+{gscData.summary.clicksDeltaPercent}%
                  </span>
                )}
              </div>
              <div className="text-xs text-muted-foreground mt-2">{t.totalImpressions}: {gscData?.summary?.impressions?.toLocaleString() ?? '—'}</div>
            </div>

            <div className="glass-card p-5">
              <div className="text-xs text-muted-foreground font-semibold mb-1">{t.avgCtr}</div>
              <div className="text-3xl font-black text-blue-500">%{gscData?.summary?.ctr ?? '0.00'}</div>
              <div className="text-xs text-muted-foreground mt-2">{t.avgPosition}: #{gscData?.summary?.position ?? '—'}</div>
            </div>

            <div className="glass-card p-5">
              <div className="text-xs text-muted-foreground font-semibold mb-1">{t.pendingApprovals}</div>
              <div className="text-3xl font-black text-amber-500">{pendingList.length}</div>
              <div className="text-xs text-muted-foreground mt-2">
                Kritik: {auditReport?.counts.critical || 0} • Uyarı: {auditReport?.counts.warning || 0}
              </div>
            </div>
          </div>

          {/* Interactive Trend Chart */}
          {gscData?.dailySeries && gscData.dailySeries.length > 0 && (
            <div className="glass-card p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-sm">Google Arama Tıklama & Gösterim Trendi</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{gscData.dataLagNotice[uiLocale]}</p>
                </div>
                <div className="inline-flex rounded-xl border border-border p-1 bg-card/60 text-xs">
                  {(['7d', '28d', '90d'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setGscRange(r)}
                      className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                        gscRange === r ? 'bg-primary text-white font-bold' : 'text-muted-foreground'
                      }`}
                    >
                      {r === '7d' ? '7 Gün' : r === '28d' ? '28 Gün' : '90 Gün'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Simple Responsive SVG Trend */}
              <div className="h-44 w-full flex items-end gap-1.5 pt-4">
                {gscData.dailySeries.map((d) => {
                  const maxClicks = Math.max(...gscData.dailySeries.map(x => x.clicks), 1);
                  const hPercent = Math.max(8, Math.round((d.clicks / maxClicks) * 100));
                  return (
                    <div
                      key={d.date}
                      className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end"
                    >
                      <div
                        className="w-full bg-primary/70 hover:bg-primary rounded-t transition-all group-hover:opacity-100"
                        style={{ height: `${hPercent}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 bg-popover text-popover-foreground text-[10px] p-2 rounded-lg shadow-lg border border-border whitespace-nowrap">
                        <div className="font-bold">{d.date}</div>
                        <div>Tıklama: {d.clicks}</div>
                        <div>Gösterim: {d.impressions}</div>
                        <div>CTR: %{d.ctr}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quick Anomaly Insights */}
          {gscData?.insights && gscData.insights.length > 0 && (
            <div className="glass-card p-6 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm">Otomatik Tespit Edilen Fırsatlar & İyileştirmeler</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {gscData.insights.slice(0, 4).map(ins => (
                  <div key={ins.id} className="p-4 rounded-xl border border-border bg-card/40 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">{ins.title[uiLocale]}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-primary/10 text-primary">
                        {ins.priority}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{ins.detail[uiLocale]}</p>
                    <div className="text-[11px] text-primary font-medium pt-1 border-t border-border/40">
                      Öneri: {ins.recommendedAction[uiLocale]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: TECHNICAL SEO AUDIT */}
      {/* ========================================================================= */}
      {activeTab === 'audit' && auditReport && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {(['all', 'critical', 'warning', 'suggestion'] as const).map(sev => (
                <button
                  key={sev}
                  onClick={() => setAuditSeverityFilter(sev)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                    auditSeverityFilter === sev
                      ? 'bg-primary text-white'
                      : 'border border-border text-muted-foreground hover:bg-accent/40'
                  }`}
                >
                  {sev === 'all'
                    ? `Tümü (${auditReport.issues.length})`
                    : sev === 'critical'
                    ? `Kritik (${auditReport.counts.critical})`
                    : sev === 'warning'
                    ? `Uyarı (${auditReport.counts.warning})`
                    : `Öneri (${auditReport.counts.suggestion})`}
                </button>
              ))}
            </div>

            <button
              onClick={() => handleRunAudit(true)}
              disabled={actionLoading}
              className="text-xs px-3.5 py-1.5 rounded-xl border border-border font-semibold hover:bg-accent inline-flex items-center gap-1.5"
            >
              <Smartphone className="w-3.5 h-3.5 text-primary" />
              <span>{t.runPsiBtn}</span>
            </button>
          </div>

          {/* Core Web Vitals Status Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(['mobile', 'desktop'] as const).map(strategy => {
              const cwv = auditReport.coreWebVitals[strategy];
              return (
                <div key={strategy} className="glass-card p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase flex items-center gap-1.5">
                      {strategy === 'mobile' ? <Smartphone className="w-4 h-4 text-primary" /> : <Laptop className="w-4 h-4 text-blue-500" />}
                      {strategy === 'mobile' ? 'Mobil Performans' : 'Masaüstü Performans'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-muted text-muted-foreground uppercase">
                      {cwv.source === 'pagespeed_api' ? 'Google PSI v5' : 'Ölçüm Bekleniyor'}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black">
                      {cwv.performanceScore !== null ? `${cwv.performanceScore}` : '—'}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 100</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
                    <div>LCP: {cwv.lcpMs ? `${cwv.lcpMs}ms` : '—'}</div>
                    <div>CLS: {cwv.cls !== null ? cwv.cls : '—'}</div>
                    <div>INP: {cwv.inpMs ? `${cwv.inpMs}ms` : '—'}</div>
                  </div>
                  <p className="text-[10px] text-muted-foreground/80">{cwv.statusMessage[uiLocale]}</p>
                </div>
              );
            })}
          </div>

          {/* Audit Issues Table */}
          <div className="glass-card divide-y divide-border">
            {filteredIssues.map(issue => (
              <div key={issue.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 max-w-2xl">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        issue.severity === 'critical'
                          ? 'bg-destructive/10 text-destructive'
                          : issue.severity === 'warning'
                          ? 'bg-amber-500/10 text-amber-500'
                          : 'bg-blue-500/10 text-blue-500'
                      }`}
                    >
                      {issue.severity}
                    </span>
                    <span className="font-bold text-xs">{issue.title[uiLocale]}</span>
                    <span className="text-[11px] text-muted-foreground">({issue.category})</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{issue.description[uiLocale]}</p>
                  <div className="text-[11px] font-mono text-muted-foreground truncate">{issue.pageUrl}</div>
                </div>

                {issue.canAutoProposeFix && (
                  <div className="shrink-0">
                    <span className="text-[11px] text-emerald-500 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg">
                      Onay Kuyruğunda Hazır
                    </span>
                  </div>
                )}
              </div>
            ))}
            {filteredIssues.length === 0 && (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Bu filtrede hiçbir SEO hatası bulunmuyor. Sistem mükemmel durumda!
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SEARCH CONSOLE METRICS */}
      {/* ========================================================================= */}
      {activeTab === 'gsc' && (
        <div className="space-y-6">
          <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Mülk: <strong className="text-foreground">{gscData?.propertyUrl || 'sc-domain:vidnoria.com'}</strong>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={gscDemoToggle}
                  onChange={e => setGscDemoToggle(e.target.checked)}
                  className="w-4 h-4 rounded text-primary"
                />
                <span className="font-medium">Demo / Örnek Veri Modu</span>
              </label>

              <div className="inline-flex rounded-xl border border-border p-1 bg-card/60 text-xs">
                {(['7d', '28d', '90d'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setGscRange(r)}
                    className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                      gscRange === r ? 'bg-primary text-white font-bold' : 'text-muted-foreground'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Top Queries Table */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-sm mb-3">En Fazla Ziyaretçi Getiren Arama Sorguları (Top Queries)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-start">
                    <th className="pb-2 text-start">Sorgu</th>
                    <th className="pb-2 text-start">Dil</th>
                    <th className="pb-2 text-end">Tıklama</th>
                    <th className="pb-2 text-end">Gösterim</th>
                    <th className="pb-2 text-end">CTR</th>
                    <th className="pb-2 text-end">Sıra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {gscData?.topQueries?.map(q => (
                    <tr key={q.query} className="hover:bg-accent/20">
                      <td className="py-2.5 font-medium">{q.query}</td>
                      <td className="py-2.5 uppercase text-[10px] text-muted-foreground">{q.locale}</td>
                      <td className="py-2.5 text-end font-bold">{q.clicks}</td>
                      <td className="py-2.5 text-end text-muted-foreground">{q.impressions}</td>
                      <td className="py-2.5 text-end text-blue-500 font-semibold">%{q.ctr}</td>
                      <td className="py-2.5 text-end font-bold text-emerald-500">#{q.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Top Pages Table */}
          <div className="glass-card p-6">
            <h3 className="font-bold text-sm mb-3">En Çok Trafik Çeken Sayfalar (Top Pages)</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-start">
                    <th className="pb-2 text-start">Sayfa URL</th>
                    <th className="pb-2 text-end">Tıklama</th>
                    <th className="pb-2 text-end">Gösterim</th>
                    <th className="pb-2 text-end">CTR</th>
                    <th className="pb-2 text-end">Sıra</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {gscData?.topPages?.map(p => (
                    <tr key={p.page} className="hover:bg-accent/20">
                      <td className="py-2.5 font-mono text-[11px] truncate max-w-xs">{p.page}</td>
                      <td className="py-2.5 text-end font-bold">{p.clicks}</td>
                      <td className="py-2.5 text-end text-muted-foreground">{p.impressions}</td>
                      <td className="py-2.5 text-end text-blue-500 font-semibold">%{p.ctr}</td>
                      <td className="py-2.5 text-end font-bold text-emerald-500">#{p.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: KEYWORDS MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'keywords' && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            {['all', 'priority', 'rising', 'declining', 'opportunities', 'page_optimization'].map(cat => (
              <button
                key={cat}
                onClick={() => setKeywordCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-xl font-semibold capitalize shrink-0 ${
                  keywordCategoryFilter === cat
                    ? 'bg-primary text-white'
                    : 'border border-border text-muted-foreground hover:bg-accent'
                }`}
              >
                {cat === 'all'
                  ? 'Tümü'
                  : cat === 'priority'
                  ? 'Öncelikli'
                  : cat === 'rising'
                  ? 'Yükselen'
                  : cat === 'declining'
                  ? 'Düşen'
                  : cat === 'opportunities'
                  ? 'Fırsatlar'
                  : 'Sayfa Optimizasyonu'}
              </button>
            ))}
          </div>

          <div className="glass-card divide-y divide-border">
            {filteredKeywords.map(kw => (
              <div key={kw.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{kw.keyword}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-muted text-muted-foreground">
                      {kw.locale}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-primary/10 text-primary">
                      {kw.category}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">Hedef Sayfa: {kw.targetPath}</div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground pt-1">
                    <span className={kw.inTitle ? 'text-emerald-500 font-semibold' : 'text-muted-foreground'}>
                      Title: {kw.inTitle ? '✓' : '✗'}
                    </span>
                    <span className={kw.inDescription ? 'text-emerald-500 font-semibold' : 'text-muted-foreground'}>
                      Desc: {kw.inDescription ? '✓' : '✗'}
                    </span>
                    <span className={kw.inH1 ? 'text-emerald-500 font-semibold' : 'text-muted-foreground'}>
                      H1: {kw.inH1 ? '✓' : '✗'}
                    </span>
                  </div>
                </div>

                <div className="text-end shrink-0">
                  <div className="text-xs text-muted-foreground">Optimizasyon Skoru</div>
                  <div className="text-lg font-black text-emerald-500">%{kw.optimizationScore}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: CONTENT MANAGER */}
      {/* ========================================================================= */}
      {activeTab === 'content' && (
        <div className="space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className="font-bold text-sm">Önerilen Yüksek Trafik Potansiyelli Blog Konuları</h3>
            <p className="text-xs text-muted-foreground">
              Aşağıdaki konular Google arama talebi yüksek, kullanıcıya doğrudan fayda sağlayan konulardan
              seçilmiştir. &quot;Taslak Oluştur&quot; butonuna bastığınızda Türkçe, İngilizce ve Arapça içerik taslağı
              hazırlanır ve onayınıza sunulur. <strong>Yönetici onayı olmadan hiçbir içerik yayımlanmaz.</strong>
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {curatedTopics.map(top => (
                <div key={top.id} className="p-4 rounded-xl border border-border bg-card/40 flex flex-col justify-between">
                  <div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-bold uppercase bg-primary/10 text-primary">
                      {top.category}
                    </span>
                    <h4 className="font-bold text-xs mt-2 line-clamp-2">{top.topic[uiLocale]}</h4>
                    <p className="text-[11px] text-muted-foreground mt-1 line-clamp-3">{top.expectedBenefit[uiLocale]}</p>
                  </div>
                  <button
                    onClick={() => handleCreateDraft(top.id)}
                    disabled={actionLoading}
                    className="mt-4 gradient-bg text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:opacity-95 text-center"
                  >
                    3 Dilli Taslak Oluştur & Onaya Sun
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Drafts List */}
          <div className="glass-card p-6 space-y-3">
            <h3 className="font-bold text-sm">Mevcut İçerik Taslakları ({drafts.length})</h3>
            <div className="divide-y divide-border">
              {drafts.map(dr => (
                <div key={dr.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <div className="font-bold text-sm">{dr.title[uiLocale]}</div>
                    <div className="text-muted-foreground text-[11px]">Slug: /blog/{dr.slug} • Durum: {dr.status}</div>
                  </div>
                  <span className="text-[10px] px-2.5 py-1 rounded-lg font-bold bg-amber-500/10 text-amber-500 uppercase">
                    {dr.status}
                  </span>
                </div>
              ))}
              {drafts.length === 0 && (
                <div className="py-4 text-center text-xs text-muted-foreground">Henüz oluşturulmuş taslak yok.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 6: APPROVALS QUEUE */}
      {/* ========================================================================= */}
      {activeTab === 'approvals' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-xs text-muted-foreground flex items-center gap-2">
            <Info className="w-4 h-4 text-primary shrink-0" />
            <span>
              <strong>Yarı Otomatik Güvenlik Kuralı:</strong> SEO başlığı, açıklama, canonical veya yeni blog
              yayınlama işlemleri siz onaylamadan asla canlıya alınmaz. Onaylanan değişiklikler anında kaydedilir ve
              istendiğinde tek tıkla geri alınabilir.
            </span>
          </div>

          <div className="space-y-4">
            {approvals.map(req => (
              <div key={req.id} className="glass-card p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                        req.status === 'pending'
                          ? 'bg-amber-500/10 text-amber-500'
                          : req.status === 'approved'
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : req.status === 'rolled_back'
                          ? 'bg-purple-500/10 text-purple-500'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {req.status}
                    </span>
                    <span className="font-bold text-sm">{req.issueSummary[uiLocale]}</span>
                  </div>

                  <span className="text-[11px] text-muted-foreground font-mono">{req.targetPage}</span>
                </div>

                {/* Diff Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                    <div className="text-[10px] text-destructive font-bold uppercase mb-1">Mevcut Değer</div>
                    <div className="text-foreground whitespace-pre-wrap break-all">{req.currentValue}</div>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <div className="text-[10px] text-emerald-500 font-bold uppercase mb-1">Önerilen Değer</div>
                    <div className="text-foreground whitespace-pre-wrap break-all">{req.proposedValue}</div>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  <strong>Beklenen Fayda:</strong> {req.expectedBenefit[uiLocale]}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  {req.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprovalAction(req.id, 'reject')}
                        disabled={actionLoading}
                        className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold hover:bg-destructive/10 hover:text-destructive"
                      >
                        {t.rejectBtn}
                      </button>
                      <button
                        onClick={() => handleApprovalAction(req.id, 'approve')}
                        disabled={actionLoading}
                        className="gradient-bg text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-sm hover:opacity-95 inline-flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{t.approveBtn}</span>
                      </button>
                    </>
                  )}

                  {req.status === 'approved' && (
                    <button
                      onClick={() => handleApprovalAction(req.id, 'rollback')}
                      disabled={actionLoading}
                      className="px-3.5 py-1.5 rounded-xl border border-border text-xs font-semibold text-purple-500 hover:bg-purple-500/10 inline-flex items-center gap-1.5"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      <span>{t.rollbackBtn}</span>
                    </button>
                  )}
                </div>
              </div>
            ))}

            {approvals.length === 0 && (
              <div className="glass-card p-12 text-center text-xs text-muted-foreground">{t.emptyApprovals}</div>
            )}
          </div>
        </div>
      )}

      {/* GitHub PR Modal Preview */}
      {selectedPrModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card w-full max-w-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <GitPullRequest className="w-4 h-4 text-primary" />
                <span>GitHub Pull Request Taslağı</span>
              </h3>
              <button onClick={() => setSelectedPrModal(null)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="p-2 bg-muted/40 rounded">Branch: {selectedPrModal.branchName}</div>
              <div className="p-2 bg-muted/40 rounded">Commit: {selectedPrModal.commitMessage}</div>
              <textarea
                readOnly
                rows={6}
                value={selectedPrModal.body}
                className="w-full p-2 bg-muted/20 border border-border rounded resize-none"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedPrModal(null)}
                className="px-4 py-1.5 rounded-xl gradient-bg text-white text-xs font-bold"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
