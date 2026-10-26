'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Download, Archive, Film, Image as ImageIcon, CheckCircle, Loader2 } from 'lucide-react';
import JSZip from 'jszip';
import type { CarouselItem } from '@/types';
import { getApiBaseUrl } from '@/lib/client-api';

interface InstagramCarouselSectionProps {
  items: CarouselItem[];
  mediaTitle: string;
  mediaId: string;
  lang: string;
}

export default function InstagramCarouselSection({
  items,
  mediaTitle,
  mediaId,
  lang,
}: InstagramCarouselSectionProps) {
  const [zipLoading, setZipLoading] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ current: number; total: number; percent: number } | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [apiBase, setApiBase] = useState('');

  useState(() => {
    getApiBaseUrl().then(url => setApiBase(url || ''));
  });

  const t = {
    tr: {
      badge: 'Instagram Çoklu Gönderi (Carousel)',
      title: 'Toplu Fotoğraf ve Video İndirme',
      subtitle: `Bu albümde toplam ${items.length} adet medya bulundu. İster tek tek, ister hepsini tek tıkla ZIP arşivi olarak indirin.`,
      downloadAllZip: `Tümünü ZIP Olarak İndir (${items.length} Dosya)`,
      zipping: 'ZIP Dosyası Hazırlanıyor...',
      downloadSuccess: 'ZIP arşivi başarıyla oluşturuldu ve indirildi!',
      singleDownload: 'İndir',
      photoBadge: 'FOTOĞRAF',
      videoBadge: 'VİDEO',
      slide: 'Slayt',
    },
    en: {
      badge: 'Instagram Multi-Post (Carousel)',
      title: 'Batch Photo & Video Downloader',
      subtitle: `Found ${items.length} media items in this post. Download individually or get all in a single ZIP archive.`,
      downloadAllZip: `Download All as ZIP (${items.length} Files)`,
      zipping: 'Preparing ZIP Archive...',
      downloadSuccess: 'ZIP archive created and downloaded successfully!',
      singleDownload: 'Download',
      photoBadge: 'PHOTO',
      videoBadge: 'VIDEO',
      slide: 'Slide',
    },
    ar: {
      badge: 'منشور متعدد (Instagram Carousel)',
      title: 'تحميل الصور ومقاطع الفيديو دفعة واحدة',
      subtitle: `تم العثور على ${items.length} وسائط. يمكنك التحميل بشكل فردي أو تحميل الكل في ملف مضغوط ZIP بنقرة واحدة.`,
      downloadAllZip: `تحميل الكل كملف ZIP (${items.length} ملفات)`,
      zipping: 'جاري تجهيز ملف ZIP...',
      downloadSuccess: 'تم إنشاء ملف ZIP وبدأ التحميل بنجاح!',
      singleDownload: 'تحميل',
      photoBadge: 'صورة',
      videoBadge: 'فيديو',
      slide: 'عنصر',
    },
  }[lang] || {
    badge: 'Instagram Carousel',
    title: 'Batch Downloader',
    subtitle: `Found ${items.length} items.`,
    downloadAllZip: `Download All as ZIP (${items.length} Files)`,
    zipping: 'Preparing ZIP...',
    downloadSuccess: 'Download started!',
    singleDownload: 'Download',
    photoBadge: 'PHOTO',
    videoBadge: 'VIDEO',
    slide: 'Slide',
  };

  const getProxyDownloadUrl = (item: CarouselItem) => {
    const ext = item.type === 'video' ? 'mp4' : 'jpg';
    const filename = `vidnoria_instagram_${mediaId}_slide_${item.index}.${ext}`;
    const targetUrl = item.url || item.thumbnail;
    const base = apiBase || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}/api/download/proxy-file?url=${encodeURIComponent(targetUrl)}&filename=${encodeURIComponent(filename)}`;
  };

  const handleDownloadAllZip = async () => {
    if (zipLoading) return;
    setZipLoading(true);
    setDownloadSuccess(false);
    setZipProgress({ current: 0, total: items.length, percent: 0 });

    try {
      const zip = new JSZip();
      const folder = zip.folder(`vidnoria_instagram_${mediaId}`) || zip;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const proxyUrl = getProxyDownloadUrl(item);
        const ext = item.type === 'video' ? 'mp4' : 'jpg';
        const filename = `slide_${String(item.index).padStart(2, '0')}.${ext}`;

        try {
          const res = await fetch(proxyUrl);
          if (res.ok) {
            const blob = await res.blob();
            folder.file(filename, blob);
          }
        } catch (fetchErr) {
          console.error(`Failed to fetch item ${item.index}:`, fetchErr);
        }

        const current = i + 1;
        setZipProgress({
          current,
          total: items.length,
          percent: Math.round((current / items.length) * 100),
        });
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(zipBlob);
      downloadLink.download = `vidnoria_instagram_${mediaId}_all.zip`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      URL.revokeObjectURL(downloadLink.href);

      setDownloadSuccess(true);
    } catch (err) {
      console.error('ZIP generation failed:', err);
    } finally {
      setZipLoading(false);
    }
  };

  return (
    <div className="w-full my-8 p-6 md:p-8 rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card/80 to-secondary/5 backdrop-blur-md shadow-xl animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-pink-500/20 via-purple-500/20 to-orange-500/20 text-pink-500 border border-pink-500/30 mb-2">
            <Archive className="w-3.5 h-3.5" />
            {t.badge}
          </span>
          <h2 className="text-xl md:text-2xl font-black text-foreground">
            {t.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-xl">
            {t.subtitle}
          </p>
        </div>

        {/* Big ZIP Download Button */}
        <div className="shrink-0 flex flex-col items-stretch md:items-end gap-2">
          <button
            onClick={handleDownloadAllZip}
            disabled={zipLoading}
            className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-sm md:text-base flex items-center justify-center gap-2.5 shadow-lg shadow-emerald-500/25 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            {zipLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{t.zipping} {zipProgress ? `(%${zipProgress.percent})` : ''}</span>
              </>
            ) : (
              <>
                <Archive className="w-5 h-5" />
                <span>{t.downloadAllZip}</span>
              </>
            )}
          </button>

          {zipLoading && zipProgress && (
            <div className="w-full md:w-64 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground font-semibold">
                <span>{zipProgress.current} / {zipProgress.total}</span>
                <span>%{zipProgress.percent}</span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300"
                  style={{ width: `${zipProgress.percent}%` }}
                />
              </div>
            </div>
          )}

          {downloadSuccess && (
            <div className="inline-flex items-center gap-1.5 text-xs text-emerald-500 font-bold animate-fade-in">
              <CheckCircle className="w-4 h-4" />
              <span>{t.downloadSuccess}</span>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Individual Items */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
        {items.map((item) => {
          const downloadUrl = getProxyDownloadUrl(item);
          const isVideo = item.type === 'video';

          return (
            <div
              key={item.id}
              className="group relative rounded-2xl border border-border bg-card/60 hover:bg-card hover:border-primary/50 overflow-hidden flex flex-col justify-between transition-all hover:shadow-lg hover:-translate-y-1"
            >
              {/* Media Preview */}
              <div className="relative aspect-square w-full bg-black/30 overflow-hidden">
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt={item.title || `Slide ${item.index}`}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    {isVideo ? <Film className="w-10 h-10" /> : <ImageIcon className="w-10 h-10" />}
                  </div>
                )}

                {/* Badge Top Left */}
                <div className="absolute top-2.5 start-2.5 flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider backdrop-blur-md bg-black/75 text-white">
                  {isVideo ? <Film className="w-3 h-3 text-pink-400" /> : <ImageIcon className="w-3 h-3 text-cyan-400" />}
                  <span>{isVideo ? t.videoBadge : t.photoBadge}</span>
                </div>

                {/* Slide Number Top Right */}
                <div className="absolute top-2.5 end-2.5 px-2 py-0.5 rounded-md text-[10px] font-black backdrop-blur-md bg-black/75 text-white">
                  {t.slide} #{item.index}
                </div>
              </div>

              {/* Item Footer & Action */}
              <div className="p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                  <span>{item.quality || (isVideo ? 'HD MP4' : 'Orijinal JPG')}</span>
                  <span className="uppercase">{item.format}</span>
                </div>

                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="w-full py-2 px-3 rounded-xl gradient-bg text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow hover:opacity-95 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>{t.singleDownload}</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
