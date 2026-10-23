'use client';

import { useState, useRef, use, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Scissors, Play, Pause, Download,
  CheckCircle2, Loader2, RefreshCw, Sparkles, Music, Film
} from 'lucide-react';
import { Locale } from '@/lib/i18n';
import AdSlot from '@/components/ads/AdSlot';
import { convertFileClient } from '@/lib/client-api';

interface AudioCutterPageProps {
  params: Promise<{ lang: string }>;
}

/**
 * Slices an AudioBuffer between startSec and endSec and encodes to 16-bit PCM WAV Blob
 */
function sliceAudioBufferToWav(buffer: AudioBuffer, startSec: number, endSec: number): Blob {
  const sampleRate = buffer.sampleRate;
  const startSample = Math.max(0, Math.floor(startSec * sampleRate));
  const endSample = Math.min(buffer.length, Math.floor(endSec * sampleRate));
  const frameCount = Math.max(1, endSample - startSample);
  const numOfChan = buffer.numberOfChannels;
  const length = frameCount * numOfChan * 2 + 44;
  const out = new ArrayBuffer(length);
  const view = new DataView(out);
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
  setUint16(1);
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan);
  setUint16(numOfChan * 2);
  setUint16(16);
  setUint32(0x61746164); // "data"
  setUint32(length - pos - 4);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numOfChan; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = startSample; i < endSample; i++) {
    for (let c = 0; c < numOfChan; c++) {
      let sample = Math.max(-1, Math.min(1, channels[c][i]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
  }

  return new Blob([out], { type: 'audio/wav' });
}

export default function AudioCutterPage({ params }: AudioCutterPageProps) {
  const resolvedParams = use(params);
  const lang = (resolvedParams.lang || 'tr') as Locale;
  const isRtl = lang === 'ar';

  const [file, setFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [peaks, setPeaks] = useState<number[]>([]);
  const [duration, setDuration] = useState<number>(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(30);
  const [exportFormat, setExportFormat] = useState<'mp3' | 'wav' | 'm4a'>('mp3');
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [cutting, setCutting] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      sourceNodeRef.current?.stop();
      audioCtxRef.current?.close();
    };
  }, []);

  const t = {
    tr: {
      back: 'Ana Sayfaya Dön',
      badge: 'MP3 Kesici & Zil Sesi Yapıcı',
      title: 'Online MP3 & Ses Kırpma Aracı',
      subtitle: 'Şarkı veya videolarınızın istediğiniz saniyelerini seçerek kırpın; telefon zil sesi, alarm veya Reels/TikTok sesi olarak hemen indirin.',
      dropTitle: 'MP3, Ses veya Video Dosyanızı Seçin',
      dropSub: 'MP3, WAV, M4A, MP4, MOV, WebM desteklenir',
      chooseBtn: 'Dosya Seç',
      changeFile: 'Başka Dosya Seç',
      startSec: 'Başlangıç Zamanı',
      endSec: 'Bitiş Zamanı',
      selectedDuration: 'Seçilen Süre',
      previewPlay: 'Seçilen Kısmı Dinle',
      previewStop: 'Durdur',
      cutBtn: 'Sesi Kırp ve Hazırla',
      cutting: 'Ses Kırpılıyor...',
      ready: 'Kırpılan Ses Dosyanız Hazır!',
      downloadBtn: 'Kırpılan Sesi İndir',
      sec: 'sn',
    },
    en: {
      back: 'Back to Home',
      badge: 'MP3 Cutter & Ringtone Maker',
      title: 'Online MP3 & Audio Trimmer',
      subtitle: 'Trim the exact part of any song or video to create ringtones, alarms, or short audio clips in seconds.',
      dropTitle: 'Select Your MP3, Audio, or Video File',
      dropSub: 'Supports MP3, WAV, M4A, MP4, MOV, WebM',
      chooseBtn: 'Select File',
      changeFile: 'Change File',
      startSec: 'Start Time',
      endSec: 'End Time',
      selectedDuration: 'Selected Duration',
      previewPlay: 'Preview Selection',
      previewStop: 'Stop Preview',
      cutBtn: 'Trim & Prepare Audio',
      cutting: 'Trimming Audio...',
      ready: 'Your Trimmed Audio is Ready!',
      downloadBtn: 'Download Trimmed Audio',
      sec: 's',
    },
    ar: {
      back: 'العودة إلى الرئيسية',
      badge: 'قص الصوت وصانع النغمات',
      title: 'أداة قص MP3 والصوت أونلاين',
      subtitle: 'قم بقص الجزء المفضل لديك من أي أغنية أو فيديو لعمل نغمة رنين في ثوانٍ.',
      dropTitle: 'اختر ملف الصوت أو الفيديو',
      dropSub: 'يدعم MP3, WAV, M4A, MP4, MOV, WebM',
      chooseBtn: 'اختر ملفاً',
      changeFile: 'تغيير الملف',
      startSec: 'وقت البداية',
      endSec: 'وقت النهاية',
      selectedDuration: 'المدة المحددة',
      previewPlay: 'استماع للمقطع',
      previewStop: 'إيقاف',
      cutBtn: 'قص وتجهيز الصوت',
      cutting: 'جاري القص...',
      ready: 'ملف الصوت المقصوص جاهز!',
      downloadBtn: 'تحميل الصوت المقصوص',
      sec: 'ث',
    },
  }[lang] || {
    back: 'Back',
    badge: 'Audio Cutter',
    title: 'Online MP3 & Audio Cutter',
    subtitle: 'Trim audio files easily.',
    dropTitle: 'Select Audio File',
    dropSub: 'MP3, WAV, M4A, MP4',
    chooseBtn: 'Select File',
    changeFile: 'Change File',
    startSec: 'Start',
    endSec: 'End',
    selectedDuration: 'Duration',
    previewPlay: 'Preview',
    previewStop: 'Stop',
    cutBtn: 'Cut Audio',
    cutting: 'Cutting...',
    ready: 'Ready!',
    downloadBtn: 'Download',
    sec: 's',
  };

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = (s % 60).toFixed(1);
    return `${mins}:${Number(secs) < 10 ? '0' : ''}${secs}`;
  };

  const handleFileSelect = async (selected: File | undefined) => {
    if (!selected) return;
    stopPreview();
    setFile(selected);
    setResultUrl(null);
    setLoadingAudio(true);

    try {
      const arrayBuffer = await selected.arrayBuffer();
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      setAudioBuffer(decoded);
      const totalDur = Number(decoded.duration.toFixed(1));
      setDuration(totalDur);
      setStartTime(0);
      setEndTime(Math.min(totalDur, 30));

      // Compute 60 waveform bars
      const rawData = decoded.getChannelData(0);
      const bars = 60;
      const blockSize = Math.floor(rawData.length / bars);
      const calculatedPeaks: number[] = [];
      for (let i = 0; i < bars; i++) {
        let sum = 0;
        const start = i * blockSize;
        for (let j = 0; j < blockSize; j += 10) {
          sum += Math.abs(rawData[start + j] || 0);
        }
        calculatedPeaks.push(Math.min(1, (sum / (blockSize / 10)) * 3.5));
      }
      setPeaks(calculatedPeaks);
    } catch {
      // Fallback
    } finally {
      setLoadingAudio(false);
    }
  };

  const stopPreview = () => {
    try {
      sourceNodeRef.current?.stop();
    } catch {
      // ignore
    }
    setPlaying(false);
  };

  const togglePreview = () => {
    if (!audioBuffer) return;
    if (playing) {
      stopPreview();
      return;
    }

    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = audioCtxRef.current || new AudioCtx();
    audioCtxRef.current = ctx;

    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.onended = () => setPlaying(false);
    source.start(0, startTime, Math.max(0.5, endTime - startTime));
    sourceNodeRef.current = source;
    setPlaying(true);
  };

  const handleCut = async () => {
    if (!audioBuffer || !file) return;
    stopPreview();
    setCutting(true);
    setResultUrl(null);

    try {
      await new Promise((r) => setTimeout(r, 350));
      const wavBlob = sliceAudioBufferToWav(audioBuffer, startTime, endTime);
      const baseName = file.name.replace(/\.[^/.]+$/, '') || 'vidnoria-clip';
      let outBlob: Blob = wavBlob;
      let outExt: string = exportFormat;

      if (exportFormat !== 'wav') {
        // Real MP3 / M4A encoding happens on the media server (FFmpeg)
        try {
          outBlob = await convertFileClient(wavBlob, `${baseName}.wav`, exportFormat);
        } catch {
          // Server unavailable: deliver an honest WAV file instead of a mislabeled one
          outBlob = wavBlob;
          outExt = 'wav';
        }
      }

      setResultUrl(URL.createObjectURL(outBlob));
      setResultName(`${baseName}-trimmed.${outExt}`);
    } finally {
      setCutting(false);
    }
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
          href={`/${lang}/video-converter`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all"
        >
          <Film className="w-4 h-4" />
          <span>Video & Ses Dönüştürücü →</span>
        </Link>
      </div>

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

      <div className="glass-card p-6 md:p-8 mb-8">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,video/*,.mp3,.wav,.m4a,.mp4,.mov,.webm,.ogg"
          onChange={(e) => handleFileSelect(e.target.files?.[0])}
          className="hidden"
        />

        {!file ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileSelect(e.dataTransfer.files?.[0]);
            }}
            className="border-2 border-dashed border-primary/30 hover:border-primary rounded-2xl p-10 md:p-14 text-center cursor-pointer bg-primary/5 hover:bg-primary/10 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl gradient-bg text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Scissors className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold mb-2">{t.dropTitle}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6">{t.dropSub}</p>
            <span className="gradient-bg text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 text-sm shadow-md">
              <Upload className="w-4 h-4" />
              <span>{t.chooseBtn}</span>
            </span>
          </div>
        ) : loadingAudio ? (
          <div className="p-12 text-center">
            <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Ses dalgaları analiz ediliyor...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Music className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground">Toplam Süre: {formatTime(duration)}</div>
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl border border-border hover:bg-accent text-xs font-semibold flex items-center gap-1.5 shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{t.changeFile}</span>
              </button>
            </div>

            {/* Visual Waveform with Active Range Highlight */}
            <div className="p-5 rounded-2xl border border-border bg-background/60">
              <div className="h-24 flex items-end gap-1 mb-4">
                {peaks.map((peak, idx) => {
                  const barTime = (idx / peaks.length) * duration;
                  const inSelection = barTime >= startTime && barTime <= endTime;
                  return (
                    <div
                      key={idx}
                      style={{ height: `${Math.max(12, Math.round(peak * 100))}%` }}
                      className={`flex-1 rounded-full transition-colors ${
                        inSelection ? 'bg-primary' : 'bg-muted-foreground/25'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Start & End Sliders */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>{t.startSec}</span>
                    <span className="text-primary font-bold">{formatTime(startTime)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, endTime - 0.5)}
                    step={0.1}
                    value={startTime}
                    onChange={(e) => {
                      setStartTime(Number(e.target.value));
                      setResultUrl(null);
                    }}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span>{t.endSec}</span>
                    <span className="text-secondary font-bold">{formatTime(endTime)}</span>
                  </div>
                  <input
                    type="range"
                    min={Math.min(duration, startTime + 0.5)}
                    max={duration}
                    step={0.1}
                    value={endTime}
                    onChange={(e) => {
                      setEndTime(Number(e.target.value));
                      setResultUrl(null);
                    }}
                    className="w-full accent-secondary cursor-pointer"
                  />
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground">
                  {t.selectedDuration}:{' '}
                  <strong className="text-foreground">
                    {Math.max(0, endTime - startTime).toFixed(1)} {t.sec}
                  </strong>
                </div>

                <div className="flex items-center gap-2">
                  {(['mp3', 'wav', 'm4a'] as const).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => {
                        setExportFormat(fmt);
                        setResultUrl(null);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase border transition-all ${
                        exportFormat === fmt
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-card hover:bg-accent'
                      }`}
                    >
                      .{fmt}
                    </button>
                  ))}

                  <button
                    onClick={togglePreview}
                    className="px-4 py-1.5 rounded-lg text-xs font-bold bg-secondary/15 text-secondary border border-secondary/30 hover:bg-secondary hover:text-white flex items-center gap-1.5 transition-all"
                  >
                    {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    <span>{playing ? t.previewStop : t.previewPlay}</span>
                  </button>
                </div>
              </div>
            </div>

            {resultUrl && !cutting && (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center animate-fade-in">
                <div className="mb-4">
                  <AdSlot slotId="download-box-ad" format="rectangle" label="İndirme Üstü 336×280 Kutu Reklam" />
                </div>
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-emerald-500 mb-1">{t.ready}</h3>
                <p className="text-xs text-muted-foreground mb-4">{resultName}</p>
                <a
                  href={resultUrl}
                  download={resultName}
                  className="gradient-bg text-white font-bold px-8 py-3.5 rounded-xl inline-flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                >
                  <Download className="w-5 h-5" />
                  <span>{t.downloadBtn} (.{exportFormat.toUpperCase()})</span>
                </a>
              </div>
            )}

            {!resultUrl && (
              <button
                onClick={handleCut}
                disabled={cutting}
                className="w-full gradient-bg text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-all"
              >
                {cutting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t.cutting}</span>
                  </>
                ) : (
                  <>
                    <Scissors className="w-5 h-5" />
                    <span>{t.cutBtn}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <AdSlot slotId="home-mid-banner" format="horizontal" />
    </div>
  );
}
