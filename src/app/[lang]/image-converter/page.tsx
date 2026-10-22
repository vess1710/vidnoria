'use client';

import { useState, useRef, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Image as ImageIcon, Download, CheckCircle2,
  Loader2, RefreshCw, Sparkles, Film, Sliders
} from 'lucide-react';
import { Locale } from '@/lib/i18n';
import AdSlot from '@/components/ads/AdSlot';

interface ImageConverterPageProps {
  params: Promise<{ lang: string }>;
}

type ImageFormat = 'png' | 'jpg' | 'webp' | 'bmp' | 'ico';

const IMAGE_FORMATS: { id: ImageFormat; label: string; mime: string; desc: Record<string, string> }[] = [
  {
    id: 'png',
    label: 'PNG',
    mime: 'image/png',
    desc: { tr: 'Kayıpsız kalite ve şeffaf arka plan desteği', en: 'Lossless quality & transparency', ar: 'جودة بدون فقدان ودعم الشفافية' },
  },
  {
    id: 'jpg',
    label: 'JPG / JPEG',
    mime: 'image/jpeg',
    desc: { tr: 'Standart fotoğraf formatı, düşük boyut', en: 'Standard photo format, small size', ar: 'صيغة صور قياسية بحجم صغير' },
  },
  {
    id: 'webp',
    label: 'WebP',
    mime: 'image/webp',
    desc: { tr: 'Modern web formatı, yüksek sıkıştırma', en: 'Modern web format, high compression', ar: 'صيغة ويب حديثة عالية الضغط' },
  },
  {
    id: 'bmp',
    label: 'BMP',
    mime: 'image/bmp',
    desc: { tr: 'Sıkıştırmasız Windows Bitmap görüntü', en: 'Uncompressed Bitmap image', ar: 'صورة نقطية غير مضغوطة' },
  },
  {
    id: 'ico',
    label: 'ICO (64×64 İkon)',
    mime: 'image/png',
    desc: { tr: 'Web siteleri ve masaüstü için kare ikon', en: 'Square icon for websites & desktop', ar: 'أيقونة مربعة للمواقع' },
  },
];

export default function ImageConverterPage({ params }: ImageConverterPageProps) {
  const resolvedParams = use(params);
  const lang = (resolvedParams.lang || 'tr') as Locale;
  const isRtl = lang === 'ar';

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<{ w: number; h: number } | null>(null);
  const [targetFormat, setTargetFormat] = useState<ImageFormat>('png');
  const [quality, setQuality] = useState<number>(92);
  const [converting, setConverting] = useState(false);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultName, setResultName] = useState<string>('');
  const [resultSize, setResultSize] = useState<number>(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = {
    tr: {
      back: 'Ana Sayfaya Dön',
      badge: 'Ücretsiz Resim Dönüştürücü',
      title: 'Fotoğraf & Resim Uzantı Dönüştürücü',
      subtitle: 'Fotoğraflarınızı saniyeler içinde JPG, PNG, WebP, BMP veya ICO formatına kalite kaybı olmadan dönüştürün ve hemen indirin.',
      switchTool: 'Video → Ses / Format Dönüştürücüye Geç (MP4, MP3, WAV) →',
      dropTitle: 'Fotoğrafınızı Seçin veya Buraya Sürükleyin',
      dropSub: 'JPG, JPEG, PNG, WebP, GIF, BMP, SVG, AVIF desteklenir',
      chooseBtn: 'Fotoğraf Seç',
      changeFile: 'Başka Fotoğraf Seç',
      selectFormat: 'Dönüştürülecek Uzantıyı Seçin',
      qualityLabel: 'Görüntü Kalitesi',
      convertBtn: 'Resmi Dönüştür',
      converting: 'Dönüştürülüyor...',
      ready: 'Resim Başarıyla Dönüştürüldü!',
      downloadBtn: 'Yeni Resmi İndir',
    },
    en: {
      back: 'Back to Home',
      badge: 'Free Image Converter',
      title: 'Photo & Image Format Converter',
      subtitle: 'Convert your photos between JPG, PNG, WebP, BMP, or ICO formats in seconds without losing quality.',
      switchTool: 'Switch to Video & Audio Converter (MP4, MP3, WAV) →',
      dropTitle: 'Select or Drag & Drop Your Image Here',
      dropSub: 'Supports JPG, JPEG, PNG, WebP, GIF, BMP, SVG, AVIF',
      chooseBtn: 'Select Image',
      changeFile: 'Change Image',
      selectFormat: 'Select Target Image Extension',
      qualityLabel: 'Image Quality',
      convertBtn: 'Convert Image',
      converting: 'Converting...',
      ready: 'Image Successfully Converted!',
      downloadBtn: 'Download Converted Image',
    },
    ar: {
      back: 'العودة إلى الرئيسية',
      badge: 'محول صور مجاني',
      title: 'محول صيغ الصور الفوتوغرافية',
      subtitle: 'حول صورك بين صيغ JPG و PNG و WebP و BMP و ICO في ثوانٍ بدون فقدان الجودة.',
      switchTool: 'انتقل إلى محول الفيديو والصوت (MP4, MP3, WAV) ←',
      dropTitle: 'اختر صورتك أو اسحبها هنا',
      dropSub: 'يدعم JPG, JPEG, PNG, WebP, GIF, BMP, SVG, AVIF',
      chooseBtn: 'اختر صورة',
      changeFile: 'تغيير الصورة',
      selectFormat: 'اختر الصيغة المطلوبة',
      qualityLabel: 'جودة الصورة',
      convertBtn: 'تحويل الصورة',
      converting: 'جاري التحويل...',
      ready: 'تم تحويل الصورة بنجاح!',
      downloadBtn: 'تحميل الصورة الجديدة',
    },
  }[lang] || {
    back: 'Back to Home',
    badge: 'Image Converter',
    title: 'Image Format Converter',
    subtitle: 'Convert images to JPG, PNG, WebP, BMP, ICO.',
    switchTool: 'Switch to Video Converter →',
    dropTitle: 'Select Image',
    dropSub: 'JPG, PNG, WebP, GIF, SVG',
    chooseBtn: 'Select Image',
    changeFile: 'Change Image',
    selectFormat: 'Select Format',
    qualityLabel: 'Quality',
    convertBtn: 'Convert',
    converting: 'Converting...',
    ready: 'Ready!',
    downloadBtn: 'Download',
  };

  const handleFileChange = (selected: File | undefined) => {
    if (!selected) return;
    setFile(selected);
    setResultUrl(null);
    const objUrl = URL.createObjectURL(selected);
    setPreviewUrl(objUrl);

    const img = new window.Image();
    img.onload = () => {
      setDimensions({ w: img.naturalWidth, h: img.naturalHeight });
    };
    img.src = objUrl;
  };

  const handleSelectFormat = (fmt: ImageFormat) => {
    setTargetFormat(fmt);
    setResultUrl(null);
  };

  const handleConvert = async () => {
    if (!file || !previewUrl) return;
    setConverting(true);
    setResultUrl(null);

    try {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Resim okunamadı'));
        img.src = previewUrl;
      });

      const canvas = document.createElement('canvas');
      if (targetFormat === 'ico') {
        canvas.width = 64;
        canvas.height = 64;
      } else {
        canvas.width = img.naturalWidth || 800;
        canvas.height = img.naturalHeight || 600;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas hatası');

      // Fill white background for JPG/BMP so transparent areas don't turn black
      if (targetFormat === 'jpg' || targetFormat === 'bmp') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const selectedOpt = IMAGE_FORMATS.find((f) => f.id === targetFormat)!;
      const q = targetFormat === 'jpg' || targetFormat === 'webp' ? quality / 100 : undefined;

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Dönüştürme başarısız'))),
          selectedOpt.mime,
          q
        );
      });

      const baseName = file.name.replace(/\.[^/.]+$/, '') || 'vidnoria-image';
      const outName = `${baseName}.${targetFormat}`;
      setResultUrl(URL.createObjectURL(blob));
      setResultName(outName);
      setResultSize(blob.size);
    } finally {
      setConverting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
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
          href={`/${lang}/video-converter`}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-all"
        >
          <Film className="w-4 h-4" />
          <span>{t.switchTool}</span>
        </Link>
      </div>

      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold bg-secondary/10 text-secondary mb-4">
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
          accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.svg,.avif"
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
            className="border-2 border-dashed border-secondary/30 hover:border-secondary rounded-2xl p-10 md:p-14 text-center cursor-pointer bg-secondary/5 hover:bg-secondary/10 transition-all"
          >
            <div className="w-16 h-16 rounded-2xl gradient-bg text-white flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Upload className="w-8 h-8" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold mb-2">{t.dropTitle}</h2>
            <p className="text-xs sm:text-sm text-muted-foreground mb-6">{t.dropSub}</p>
            <span className="gradient-bg text-white font-semibold px-6 py-3 rounded-xl inline-flex items-center gap-2 text-sm shadow-md">
              <ImageIcon className="w-4 h-4" />
              <span>{t.chooseBtn}</span>
            </span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Image Preview & Meta */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl border border-border bg-card/60">
              <div className="flex items-center gap-4 min-w-0">
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt={file.name}
                    className="w-20 h-20 object-cover rounded-xl border border-border shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="font-bold text-sm sm:text-base truncate">{file.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatBytes(file.size)}
                    {dimensions ? ` • ${dimensions.w} × ${dimensions.h} px` : ''}
                  </div>
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

            {/* Format Options */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-primary" />
                <span>{t.selectFormat}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {IMAGE_FORMATS.map((fmt) => {
                  const active = targetFormat === fmt.id;
                  return (
                    <button
                      key={fmt.id}
                      onClick={() => handleSelectFormat(fmt.id)}
                      className={`p-3.5 rounded-xl border text-start transition-all ${
                        active
                          ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                          : 'border-border bg-card/50 hover:bg-card'
                      }`}
                    >
                      <div className="font-bold text-sm">{fmt.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                        {fmt.desc[lang] || fmt.desc.tr}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quality Slider for JPG & WebP */}
            {(targetFormat === 'jpg' || targetFormat === 'webp') && (
              <div className="p-4 rounded-xl border border-border bg-card/40">
                <div className="flex items-center justify-between text-xs font-semibold mb-2">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-primary" />
                    {t.qualityLabel}
                  </span>
                  <span className="text-primary font-bold">%{quality}</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={100}
                  value={quality}
                  onChange={(e) => {
                    setQuality(Number(e.target.value));
                    setResultUrl(null);
                  }}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            )}

            {/* Ready Result */}
            {resultUrl && !converting && (
              <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center animate-fade-in">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-base font-bold text-emerald-500 mb-1">{t.ready}</h3>
                <p className="text-xs text-muted-foreground mb-4">
                  {resultName} ({formatBytes(resultSize)})
                </p>
                <a
                  href={resultUrl}
                  download={resultName}
                  className="gradient-bg text-white font-bold px-8 py-3.5 rounded-xl inline-flex items-center gap-2 shadow-lg hover:scale-105 transition-transform"
                >
                  <Download className="w-5 h-5" />
                  <span>{t.downloadBtn} (.{targetFormat.toUpperCase()})</span>
                </a>
              </div>
            )}

            {!resultUrl && (
              <button
                onClick={handleConvert}
                disabled={converting}
                className="w-full gradient-bg text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg hover:opacity-95 transition-all"
              >
                {converting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>{t.converting}</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5" />
                    <span>
                      {t.convertBtn} (.{targetFormat.toUpperCase()})
                    </span>
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
