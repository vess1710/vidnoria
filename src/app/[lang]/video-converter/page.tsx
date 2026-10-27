'use client';

import { useState, useRef, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Film, Music, Download, CheckCircle2,
  Loader2, RefreshCw, FileVideo, Sparkles, Image as ImageIcon
} from 'lucide-react';
import { Locale } from '@/lib/i18n';
import AdSlot from '@/components/ads/AdSlot';
import DownloadCountdownModal from '@/components/download/DownloadCountdownModal';
import { convertFileClient } from '@/lib/client-api';

interface VideoConverterPageProps {
  params: Promise<{ lang: string }>;
}

type TargetFormat = 'mp3' | 'wav' | 'm4a' | 'mp4' | 'webm' | 'mov';

const FORMAT_OPTIONS: { id: TargetFormat; label: string; category: 'audio' | 'video'; desc: Record<string, string>; mime: string }[] = [
  {
    id: 'mp3',
    label: 'MP3 (Ses)',
    category: 'audio',
    desc: { tr: 'Videoyu MP3 ses dosyasına çevir', en: 'Extract MP3 audio from video', ar: 'تحويل الفيديو إلى صوت MP3' },
    mime: 'audio/mpeg',
  },
  {
    id: 'wav',
    label: 'WAV (Kayıpsız Ses)',
    category: 'audio',
    desc: { tr: 'Stüdyo kalitesinde WAV sese çevir', en: 'Lossless studio WAV audio', ar: 'صوت WAV عالي الجودة' },
    mime: 'audio/wav',
  },
  {
    id: 'm4a',
    label: 'M4A / AAC (Ses)',
    category: 'audio',
    desc: { tr: 'Apple / Mobil uyumlu ses formatı', en: 'Apple / Mobile audio format', ar: 'صيغة صوت M4A' },
    mime: 'audio/mp4',
  },
  {
    id: 'mp4',
    label: 'MP4 (Video)',
    category: 'video',
    desc: { tr: 'Tüm cihazlarla uyumlu MP4 video', en: 'Universal MP4 video format', ar: 'فيديو MP4 عالمي' },
    mime: 'video/mp4',
  },
  {
    id: 'webm',
    label: 'WebM (Video)',
    category: 'video',
    desc: { tr: 'Yüksek sıkıştırmalı WebM video', en: 'Web-optimized WebM video', ar: 'فيديو WebM للويب' },
    mime: 'video/webm',
  },
  {
    id: 'mov',
    label: 'MOV (Video)',
    category: 'video',
    desc: { tr: 'QuickTime / iPhone uyumlu video', en: 'QuickTime / Apple MOV video', ar: 'فيديو MOV' },
    mime: 'video/quicktime',
  },
];

/**
 * Encodes an AudioBuffer into a standard 16-bit PCM WAV Blob
 */
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
  const channels: Float32Array[] = [];
  let sample = 0;
  let offset = 0;
  let pos = 0;

  const setUint16 = (data: number) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };
  const setUint32 = (data: number) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([out], { type: 'audio/wav' });
}

export default function VideoConverterPage({ params }: VideoConverterPageProps) {
  const resolvedParams = use(params);
  const lang = (resolvedParams.lang || 'tr') as Locale;
  const isRtl = lang === 'ar';

  const [file, setFile] = useState<File | null>(null);
  const [targetFormat, setTargetFormat] = useState<TargetFormat>('mp3');
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>('');
  const [showCountdown, setShowCountdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    tr: {
      back: 'Ana Sayfaya Dön',
      badge: 'Ücretsiz Dosya Dönüştürücü',
      title: 'Video & Ses Uzantı Dönüştürücü',
      subtitle: 'Bilgisayarınızdan veya telefonunuzdan bir video yükleyin; saniyeler içinde MP3 sese çevirin veya video uzantısını (MP4, WebM, MOV, WAV) değiştirin.',
      switchTool: 'Fotoğraf / Resim Uzantı Dönüştürücüye Geç (JPG, PNG, WebP) →',
      dropTitle: 'Video veya Ses Dosyanızı Seçin / Buraya Sürükleyin',
      dropSub: 'MP4, MOV, MKV, AVI, WebM, MP3, WAV, M4A desteklenir',
      chooseBtn: 'Dosya Seç',
      selectedFile: 'Seçilen Dosya',
      changeFile: 'Başka Dosya Seç',
      audioSection: 'Videoyu Sese Çevir (Ses Formatları)',
      videoSection: 'Video Uzantısını Değiştir (Video Formatları)',
      convertBtn: 'Şimdi Dönüştür',
      converting: 'Dönüştürülüyor...',
      ready: 'Dönüştürme Tamamlandı! Dosyanız Hazır',
      downloadBtn: 'Dönüştürülen Dosyayı İndir',
      convertAnother: 'Farklı Bir Formata Çevir',
    },
    en: {
      back: 'Back to Home',
      badge: 'Free File Converter',
      title: 'Video & Audio Format Converter',
      subtitle: 'Upload any video from your phone or computer; extract MP3/WAV audio or convert video extensions (MP4, WebM, MOV) in seconds.',
      switchTool: 'Switch to Image Format Converter (JPG, PNG, WebP) →',
      dropTitle: 'Select or Drag & Drop Your Video / Audio File',
      dropSub: 'Supports MP4, MOV, MKV, AVI, WebM, MP3, WAV, M4A',
      chooseBtn: 'Select File',
      selectedFile: 'Selected File',
      changeFile: 'Change File',
      audioSection: 'Convert Video to Audio (Audio Formats)',
      videoSection: 'Change Video Extension (Video Formats)',
      convertBtn: 'Convert Now',
      converting: 'Converting...',
      ready: 'Conversion Complete! Your File is Ready',
      downloadBtn: 'Download Converted File',
      convertAnother: 'Convert to Another Format',
    },
    ar: {
      back: 'العودة إلى الرئيسية',
      badge: 'محول ملفات مجاني',
      title: 'محول صيغ الفيديو والصوت',
      subtitle: 'ارفع أي فيديو من هاتفك أو حاسوبك وحوله إلى صوت MP3 أو WAV أو غير امتداد الفيديو (MP4، WebM، MOV) في ثوانٍ.',
      switchTool: 'انتقل إلى محول صيغ الصور (JPG, PNG, WebP) ←',
      dropTitle: 'اختر أو اسحب ملف الفيديو أو الصوت هنا',
      dropSub: 'يدعم MP4, MOV, MKV, AVI, WebM, MP3, WAV, M4A',
      chooseBtn: 'اختر ملفاً',
      selectedFile: 'الملف المحدد',
      changeFile: 'تغيير الملف',
      audioSection: 'تحويل الفيديو إلى صوت',
      videoSection: 'تغيير امتداد الفيديو',
      convertBtn: 'تحويل الآن',
      converting: 'جاري التحويل...',
      ready: 'اكتمل التحويل! ملفك جاهز',
      downloadBtn: 'تحميل الملف المحول',
      convertAnother: 'تحويل إلى صيغة أخرى',
    },
  }[lang] || {
    back: 'Back to Home',
    badge: 'Free Converter',
    title: 'Video & Audio Format Converter',
    subtitle: 'Convert video to MP3/WAV audio or change video extensions.',
    switchTool: 'Switch to Image Format Converter →',
    dropTitle: 'Select Video or Audio File',
    dropSub: 'MP4, MOV, WebM, MP3, WAV',
    chooseBtn: 'Select File',
    selectedFile: 'Selected File',
    changeFile: 'Change File',
    audioSection: 'Audio Formats',
    videoSection: 'Video Formats',
    convertBtn: 'Convert Now',
    converting: 'Converting...',
    ready: 'Ready!',
    downloadBtn: 'Download',
    convertAnother: 'Convert Another',
  };

  const handleFileChange = (selected: File | undefined) => {
    if (!selected) return;
    setFile(selected);
    setResultUrl(null);
    setError(null);
  };

  const handleSelectFormat = (fmt: TargetFormat) => {
    setTargetFormat(fmt);
    setResultUrl(null);
  };

  const handleConvert = async () => {
    if (!file) return;
    setConverting(true);
    setProgress(15);
    setError(null);
    setResultUrl(null);

    try {
      const baseName = file.name.replace(/\.[^/.]+$/, '') || 'vidnoria-media';
      const outFilename = `${baseName}.${targetFormat}`;
      const selectedOpt = FORMAT_OPTIONS.find((f) => f.id === targetFormat)!;
      let outBlob: Blob;

      if (targetFormat === 'wav') {
        // WAV can be produced locally in the browser
        setProgress(40);
        const arrayBuffer = await file.arrayBuffer();
        setProgress(65);
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioCtx();
        try {
          const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
          setProgress(85);
          outBlob = audioBufferToWavBlob(audioBuffer);
        } finally {
          await audioCtx.close();
        }
      } else {
        // MP3 / M4A / MP4 / WebM / MOV are converted for real with FFmpeg on the media server
        setProgress(40);
        const converted = await convertFileClient(file, file.name, targetFormat);
        setProgress(90);
        outBlob = new Blob([converted], { type: selectedOpt.mime });
      }

      setResultUrl(URL.createObjectURL(outBlob));
      setResultName(outFilename);
      setProgress(100);
    } catch (e) {
      setError(
        e instanceof Error && e.message
          ? e.message
          : 'Dönüştürme başarısız oldu. Dosya formatı desteklenmiyor olabilir.'
      );
    } finally {
      setConverting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="container-custom py-12 md:py-16 max-w-4xl" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <Link
          href={`/${lang}`}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          <span>{t.back}</span>
        </Link>

        <Link
          href={`/${lang}/image-converter`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary hover:text-white transition-all"
        >
          <ImageIcon className="w-4 h-4" />
          <span>{t.switchTool}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary mb-4">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t.badge}</span>
        </span>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4 gradient-text">
          {t.title}
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
          {t.subtitle}
        </p>
      </div>

      <div className="mb-8">
        <AdSlot slotId="home-top-banner" format="horizontal" />
      </div>

      {/* Upload Box */}
      <div className="glass-card p-6 md:p-8 mb-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*,audio/*,.mp4,.mov,.mkv,.avi,.webm,.mp3,.wav,.m4a,.ogg"
          onChange={(e) => handleFileChange(e.target.files?.[0])}
          className="hidden"
        />

        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileChange(e.dataTransfer.files?.[0]);
            }}
            className="border-2 border-dashed border-primary/30 hover:border-primary rounded-2xl p-10 md:p-14 text-center cursor-pointer bg-primary/5 hover:bg-primary/10 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl gradient-bg text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Upload className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold mb-2">{t.dropTitle}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6">{t.dropSub}</p>
            <span className="gradient-bg text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 text-sm shadow-md">
              <Film className="w-4 h-4" />
              <span>{t.chooseBtn}</span>
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Selected File Info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <FileVideo className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{t.selectedFile}</div>
                  <div className="font-bold text-sm sm:text-base truncate">{file.name}</div>
                  <div className="text-xs text-primary font-semibold">{formatBytes(file.size)}</div>
                </div>
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl border border-border hover:bg-accent text-xs font-semibold flex items-center gap-1.5 self-start sm:self-center shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.changeFile}</span>
              </button>
            </div>

            {/* Audio Formats (Video -> Audio) */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Music className="w-4 h-4 text-purple-500" />
                <span>{t.audioSection}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {FORMAT_OPTIONS.filter((f) => f.category === 'audio').map((fmt) => {
                  const active = targetFormat === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => handleSelectFormat(fmt.id)}
                      className={`p-4 rounded-xl border text-start transition-all ${
                        active
                          ? 'border-secondary bg-secondary/10 ring-2 ring-secondary/30'
                          : 'border-border bg-card/50 hover:bg-card'
                      }`}
                    >
                      <div className="font-bold text-sm">{fmt.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {fmt.desc[lang] || fmt.desc.tr}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Video Formats */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Film className="w-4 h-4 text-blue-500" />
                <span>{t.videoSection}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {FORMAT_OPTIONS.filter((f) => f.category === 'video').map((fmt) => {
                  const active = targetFormat === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => handleSelectFormat(fmt.id)}
                      className={`p-4 rounded-xl border text-start transition-all ${
                        active
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                          : 'border-border bg-card/50 hover:bg-card'
                      }`}
                    >
                      <div className="font-bold text-sm">{fmt.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {fmt.desc[lang] || fmt.desc.tr}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Progress */}
            {converting && (
              <div className="p-5 rounded-2xl bg-primary/5 border border-primary/20">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-primary flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {t.converting}
                  </span>
                  <span className="text-xs font-bold">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full gradient-bg transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Result Download */}
            {resultUrl && !converting && (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center animate-fade-in">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-emerald-500 mb-1">{t.ready}</h3>
                <p className="text-xs text-muted-foreground mb-4">{resultName}</p>
                <button
                  type="button"
                  onClick={() => setShowCountdown(true)}
                  className="gradient-bg text-white font-bold px-8 py-3.5 rounded-xl inline-flex items-center gap-2 shadow-lg hover:scale-105 transition-transform cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  <span>{t.downloadBtn} ({targetFormat.toUpperCase()})</span>
                </button>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}

            {!resultUrl && !converting && (
              <button
                onClick={handleConvert}
                className="w-full gradient-bg text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                <span>
                  {t.convertBtn} (.{targetFormat.toUpperCase()})
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <AdSlot slotId="home-mid-banner" format="horizontal" />

      {/* High-CTR Countdown Ad Modal */}
      {resultUrl && (
        <DownloadCountdownModal
          isOpen={showCountdown}
          onClose={() => setShowCountdown(false)}
          downloadUrl={resultUrl}
          fileName={resultName}
          formatLabel={`Video (${targetFormat.toUpperCase()})`}
          lang={lang}
          initialSeconds={10}
          slotId="video-converter-countdown-ad"
        />
      )}
    </div>
  );
}
