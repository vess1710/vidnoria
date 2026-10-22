'use client';

import { useEffect, useState, use } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  ArrowLeft, Download, CheckCircle2, AlertTriangle, 
  Loader2, Music, Video, RefreshCw, Clock, User, QrCode, Scissors
} from 'lucide-react';
import { MediaInfo, FormatOption, DownloadJob } from '@/types';
import { Locale, getDirection } from '@/lib/i18n';
import AdSlot from '@/components/ads/AdSlot';
import { analyzeUrlClient, startDownloadClient, pollJobStatusClient } from '@/lib/client-api';

interface DownloadPageProps {
  params: Promise<{ lang: string }>;
}

export default function DownloadPage({ params }: DownloadPageProps) {
  const resolvedParams = use(params);
  const lang = resolvedParams.lang as Locale;
  const isRtl = lang === 'ar';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<FormatOption | null>(null);

  // Job progress state
  const [job, setJob] = useState<DownloadJob | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showQr, setShowQr] = useState(false);

  // Translations dictionary loaded dynamically or simple fallback mapping
  const texts = {
    tr: {
      back: 'Ana Sayfaya Dön',
      preparing: 'Medya Bilgileri Alınıyor...',
      selectFormat: 'Format ve Kalite Seçin',
      video: 'Video Formatları',
      audio: 'Ses Formatları (MP3/M4A)',
      duration: 'Süre',
      creator: 'Yayınlayan',
      startDownload: 'Dönüştür ve İndir',
      processing: 'Hazırlanıyor ve İşleniyor...',
      ready: 'Dosyanız İndirmeye Hazır!',
      downloadNow: 'Hemen İndir',
      retry: 'Yeniden Dene',
      sec: 'sn',
      min: 'dk',
      disclaimer: 'Vidnoria yalnızca telif hakkı sahibinin izin verdiği veya kamuya açık içeriklerin indirilmesini destekler.',
    },
    en: {
      back: 'Back to Home',
      preparing: 'Fetching Media Info...',
      selectFormat: 'Select Format & Quality',
      video: 'Video Formats',
      audio: 'Audio Formats (MP3/M4A)',
      duration: 'Duration',
      creator: 'Creator',
      startDownload: 'Convert & Download',
      processing: 'Preparing & Processing...',
      ready: 'Your File is Ready to Download!',
      downloadNow: 'Download Now',
      retry: 'Try Again',
      sec: 's',
      min: 'm',
      disclaimer: 'Vidnoria only supports downloading content permitted by the copyright holder or in the public domain.',
    },
    ar: {
      back: 'العودة إلى الصفحة الرئيسية',
      preparing: 'جاري جلب معلومات الوسائط...',
      selectFormat: 'اختر التنسيق والجودة',
      video: 'تنسيقات الفيديو',
      audio: 'تنسيقات الصوت (MP3/M4A)',
      duration: 'المدة',
      creator: 'الناشر',
      startDownload: 'تحويل وتحميل',
      processing: 'جاري التجهيز والمعالجة...',
      ready: 'ملفك جاهز للتحميل الآن!',
      downloadNow: 'تحميل الآن',
      retry: 'إعادة المحاولة',
      sec: 'ثانية',
      min: 'دقيقة',
      disclaimer: 'فيدنوريا تدعم فقط تحميل المحتوى المصرح به من قبل صاحب حقوق النشر أو المتاح للعامة.',
    },
  }[lang] || {
    back: 'Back to Home',
    preparing: 'Fetching Media Info...',
    selectFormat: 'Select Format & Quality',
    video: 'Video Formats',
    audio: 'Audio Formats',
    duration: 'Duration',
    creator: 'Creator',
    startDownload: 'Convert & Download',
    processing: 'Processing...',
    ready: 'Ready to Download!',
    downloadNow: 'Download Now',
    retry: 'Try Again',
    sec: 's',
    min: 'm',
    disclaimer: 'Notice: Vidnoria respects copyright.',
  };

  useEffect(() => {
    async function loadMedia() {
      const targetUrl =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('url')
          : null;
      if (!targetUrl) {
        setError('No URL provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await analyzeUrlClient(targetUrl);
        if (!data.success || !data.data) {
          setError(data.error?.message || 'Could not analyze content.');
          return;
        }

        setMediaInfo(data.data);
        try {
          const rawHist = localStorage.getItem('vidnoria_recent_history');
          const list = rawHist ? JSON.parse(rawHist) : [];
          const filtered = list.filter((x: any) => x.url !== targetUrl);
          filtered.unshift({
            id: data.data.id,
            title: data.data.title,
            thumbnail: data.data.thumbnail,
            platform: data.data.platform,
            url: targetUrl,
          });
          localStorage.setItem('vidnoria_recent_history', JSON.stringify(filtered.slice(0, 6)));
        } catch {
          // ignore
        }
        if (data.data.availableFormats?.length > 0) {
          // Default to first video or audio format
          setSelectedFormat(data.data.availableFormats[0]);
        }
      } catch (e: any) {
        setError(e.message || 'Network error occurred');
      } finally {
        setLoading(false);
      }
    }

    loadMedia();
  }, []);

  // Handle format selection change (resets previous completed job so user can convert new format)
  const handleSelectFormat = (fmt: FormatOption) => {
    setSelectedFormat(fmt);
    if (job && job.selectedFormat?.formatId !== fmt.formatId) {
      setJob(null);
    }
  };

  // Handle start download job
  const handleStartProcess = async () => {
    if (!mediaInfo || !selectedFormat) return;

    setJob(null);
    setError(null);
    setProcessing(true);
    try {
      const data = await startDownloadClient(mediaInfo, selectedFormat);
      if (!data.success || !data.job) {
        setError(data.error || 'Failed to start job');
        setProcessing(false);
        return;
      }

      setJob(data.job);
      const jobId = data.job.jobId;
      pollJobStatus(jobId);
    } catch (e: any) {
      setError(e.message || 'Failed to connect');
      setProcessing(false);
    }
  };

  // Poll job status until complete or failed
  const pollJobStatus = (jobId: string) => {
    const interval = setInterval(async () => {
      try {
        const data = await pollJobStatusClient(jobId);

        if (data.success && data.job) {
          setJob(data.job);
          if (data.job.status === 'completed') {
            clearInterval(interval);
            setProcessing(false);
          } else if (data.job.status === 'failed' || data.job.status === 'cancelled') {
            clearInterval(interval);
            setProcessing(false);
            setError(data.job.error || 'Download processing failed.');
          }
        }
      } catch {
        clearInterval(interval);
        setProcessing(false);
      }
    }, 1500);
  };

  const formatDuration = (seconds: number) => {
    if (!seconds) return '—';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins} ${texts.min} ${secs} ${texts.sec}`;
  };

  return (
    <div className="container-custom py-12 md:py-20" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Navigation */}
      <Link
        href={`/${lang}`}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
        <span>{texts.back}</span>
      </Link>

      {/* Ad Placement Top */}
      <div className="mb-8">
        <AdSlot slotId="download-top-ad" format="horizontal" />
      </div>

      {loading && (
        <div className="glass-card max-w-xl mx-auto p-12 text-center">
          <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">{texts.preparing}</h2>
        </div>
      )}

      {error && !loading && (
        <div className="glass-card max-w-xl mx-auto p-8 text-center border-destructive/20">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Hata / Error</h2>
          <p className="text-sm text-muted-foreground mb-6">{error}</p>
          <Link
            href={`/${lang}`}
            className="gradient-bg text-white px-6 py-2.5 rounded-xl font-medium inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>{texts.retry}</span>
          </Link>
        </div>
      )}

      {mediaInfo && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Media Preview Card */}
          <div className="lg:col-span-5 glass-card overflow-hidden">
            <div className="relative aspect-video w-full bg-black/40">
              {mediaInfo.thumbnail ? (
                <Image
                  src={mediaInfo.thumbnail}
                  alt={mediaInfo.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Video className="w-12 h-12" />
                </div>
              )}
              <span className="absolute bottom-3 end-3 px-2.5 py-1 text-xs font-semibold bg-black/80 text-white rounded-md backdrop-blur-md">
                {mediaInfo.platform.toUpperCase()}
              </span>
            </div>

            <div className="p-6">
              <h1 className="text-lg md:text-xl font-bold text-foreground line-clamp-2 mb-4">
                {mediaInfo.title}
              </h1>

              <div className="space-y-2 text-sm text-muted-foreground">
                {mediaInfo.creator && (
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span>{texts.creator}: <strong>{mediaInfo.creator}</strong></span>
                  </div>
                )}
                {mediaInfo.duration > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>{texts.duration}: <strong>{formatDuration(mediaInfo.duration)}</strong></span>
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-border space-y-2.5">
                {mediaInfo.thumbnail && (
                  <a
                    href={mediaInfo.thumbnail}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={`${mediaInfo.title || 'thumbnail'}.jpg`}
                    className="w-full py-2.5 px-4 rounded-xl border border-primary/30 bg-primary/10 text-primary hover:bg-primary hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {lang === 'tr'
                        ? 'HD Kapak Resmini (Thumbnail) İndir'
                        : lang === 'ar'
                        ? 'تحميل الصورة المصغرة (HD)'
                        : 'Download HD Thumbnail'}
                    </span>
                  </a>
                )}

                <button
                  onClick={() => setShowQr(!showQr)}
                  className="w-full py-2.5 px-4 rounded-xl border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary hover:text-white text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <QrCode className="w-4 h-4" />
                  <span>
                    {lang === 'tr'
                      ? 'Telefona QR Kod ile Gönder'
                      : lang === 'ar'
                      ? 'إرسال للهاتف عبر رمز QR'
                      : 'Send to Phone via QR Code'}
                  </span>
                </button>

                {showQr && (
                  <div className="p-4 rounded-xl border border-border bg-background/80 text-center animate-fade-in">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                        typeof window !== 'undefined' ? window.location.href : 'https://vidnoria.com'
                      )}`}
                      alt="QR Code"
                      className="w-36 h-36 mx-auto rounded-lg bg-white p-2 mb-2"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {lang === 'tr'
                        ? 'Telefon kameranızla okutarak bu videoyu doğrudan telefonunuzda açıp indirebilirsiniz.'
                        : 'Scan with your phone camera to open and download directly on mobile.'}
                    </p>
                  </div>
                )}

                <Link
                  href={`/${lang}/audio-cutter`}
                  className="w-full py-2 px-4 rounded-xl border border-border bg-card/60 hover:bg-accent text-muted-foreground hover:text-foreground text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Scissors className="w-3.5 h-3.5 text-primary" />
                  <span>
                    {lang === 'tr'
                      ? 'MP3 Ses Kesici / Zil Sesi Yapıcı'
                      : lang === 'ar'
                      ? 'قص الصوت وصانع النغمات'
                      : 'MP3 Cutter / Ringtone Maker'}
                  </span>
                </Link>
              </div>
            </div>
          </div>

          {/* Format Selection & Download Action */}
          <div className="lg:col-span-7 glass-card p-6 md:p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              <span>{texts.selectFormat}</span>
            </h2>

            {/* Video Formats */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-blue-500" />
                <span>{texts.video}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {mediaInfo.availableFormats
                  ?.filter((f) => f.type === 'video')
                  .map((fmt) => {
                    const isSelected = selectedFormat?.formatId === fmt.formatId;
                    return (
                      <button
                        key={fmt.formatId}
                        onClick={() => handleSelectFormat(fmt)}
                        disabled={processing}
                        className={`p-3 rounded-xl border text-start transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border bg-card/50 hover:bg-card'
                        }`}
                      >
                        <div className="text-sm font-semibold">{fmt.label}</div>
                        <div className="text-xs text-muted-foreground uppercase">{fmt.format}</div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Audio Formats */}
            <div className="mb-8">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Music className="w-3.5 h-3.5 text-purple-500" />
                <span>{texts.audio}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {mediaInfo.availableFormats
                  ?.filter((f) => f.type === 'audio')
                  .map((fmt) => {
                    const isSelected = selectedFormat?.formatId === fmt.formatId;
                    return (
                      <button
                        key={fmt.formatId}
                        onClick={() => handleSelectFormat(fmt)}
                        disabled={processing}
                        className={`p-3 rounded-xl border text-start transition-all ${
                          isSelected
                            ? 'border-secondary bg-secondary/10 shadow-sm'
                            : 'border-border bg-card/50 hover:bg-card'
                        }`}
                      >
                        <div className="text-sm font-semibold">{fmt.label}</div>
                        <div className="text-xs text-muted-foreground uppercase">{fmt.format}</div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Processing / Progress State */}
            {processing && (
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20 mb-6 animate-pulse">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-primary flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {texts.processing}
                  </span>
                  <span className="text-xs font-bold">{job?.progress || 25}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-bg transition-all duration-300"
                    style={{ width: `${job?.progress || 25}%` }}
                  />
                </div>
              </div>
            )}

            {/* High-CTR 336x280 Rectangle Ad Slot above Download Action */}
            <div className="mb-6">
              <AdSlot
                slotId="download-box-ad"
                format="rectangle"
                label="İndirme Üstü 336×280 Odaklı Kutu Reklam"
              />
            </div>

            {/* Ready State */}
            {job?.status === 'completed' && job.downloadUrl && (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 mb-6 text-center animate-fade-in">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-emerald-500 mb-1">{texts.ready}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {selectedFormat?.label} ({selectedFormat?.format.toUpperCase()})
                </p>
                <a
                  href={job.downloadUrl}
                  className="gradient-bg text-white font-bold px-8 py-3.5 rounded-xl inline-flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                >
                  <Download className="w-5 h-5" />
                  <span>{texts.downloadNow}</span>
                </a>
              </div>
            )}

            {/* Action Trigger Button */}
            {(!job || job.status !== 'completed') && !processing && (
              <button
                onClick={handleStartProcess}
                disabled={!selectedFormat}
                className="w-full gradient-bg text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-all disabled:opacity-50"
              >
                <Download className="w-5 h-5" />
                <span>{texts.startDownload}</span>
              </button>
            )}

            <p className="text-xs text-center text-muted-foreground mt-4 leading-relaxed">
              {texts.disclaimer}
            </p>
          </div>
        </div>
      )}

      {/* Ad Placement Bottom */}
      <div className="mt-12">
        <AdSlot slotId="download-bottom-ad" format="auto" />
      </div>
    </div>
  );
}
