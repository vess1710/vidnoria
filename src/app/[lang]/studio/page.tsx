'use client';

import { useState, useRef, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Film, Image as ImageIcon, Download, CheckCircle2,
  Loader2, RefreshCw, Sparkles, Scissors, Music, Sliders, RotateCw,
  RotateCcw, FlipHorizontal, FlipVertical, Play, Pause, Volume2, VolumeX,
  FileCheck, ShieldCheck, Zap, HelpCircle, ChevronDown, ChevronUp, AlertCircle
} from 'lucide-react';
import { Locale } from '@/lib/i18n';
import AdSlot from '@/components/ads/AdSlot';

interface StudioPageProps {
  params: Promise<{ lang: string }>;
}

type StudioMode = 'video' | 'image';
type VideoAspectRatio = 'original' | '9:16' | '16:9' | '1:1' | '4:5';
type VideoFormat = 'webm' | 'mp4' | 'gif';
type ImageFormat = 'jpg' | 'png' | 'webp' | 'ico' | 'bmp';

/**
 * Encodes an AudioBuffer slice to 16-bit PCM WAV Blob (Client-Side)
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
  setUint32(length - 44);

  const channels: Float32Array[] = [];
  for (let c = 0; c < numOfChan; c++) {
    channels.push(buffer.getChannelData(c));
  }

  for (let i = 0; i < frameCount; i++) {
    for (let c = 0; c < numOfChan; c++) {
      let sample = channels[c][startSample + i] || 0;
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      pos += 2;
    }
  }

  return new Blob([out], { type: 'audio/wav' });
}

export default function StudioPage({ params }: StudioPageProps) {
  const resolvedParams = use(params);
  const lang = (resolvedParams.lang || 'tr') as Locale;
  const isRtl = lang === 'ar';

  // Mode Selection
  const [mode, setMode] = useState<StudioMode>('video');
  const [isDragging, setIsDragging] = useState(false);

  // Common file state
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Video specific state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [muteAudio, setMuteAudio] = useState(false);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('mp4');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('original');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);

  // Image / HEIC specific state
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ w: number; h: number } | null>(null);
  const [customWidth, setCustomWidth] = useState(0);
  const [customHeight, setCustomHeight] = useState(0);
  const [lockAspect, setLockAspect] = useState(true);
  const [rotation, setRotation] = useState(0);
  const [flipH, setFlipH] = useState(false);
  const [flipV, setFlipV] = useState(false);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [grayscale, setGrayscale] = useState(false);
  const [sepia, setSepia] = useState(false);
  const [imageFormat, setImageFormat] = useState<ImageFormat>('jpg');
  const [quality, setQuality] = useState(90);
  const [isHeicConverting, setIsHeicConverting] = useState(false);

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Clean up ObjectURL on unmount or file change
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  // Load HEIC script if needed
  const ensureHeicScript = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return false;
    if ((window as any).heic2any) return true;

    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle incoming file (via drop or picker)
  const processIncomingFile = async (selectedFile: File) => {
    setStatusMessage(null);
    setProgress(0);

    const isHeic =
      selectedFile.name.toLowerCase().endsWith('.heic') ||
      selectedFile.name.toLowerCase().endsWith('.heif') ||
      selectedFile.type === 'image/heic' ||
      selectedFile.type === 'image/heif';

    const isVideo = selectedFile.type.startsWith('video/') || selectedFile.name.match(/\.(mp4|mov|webm|avi|mkv|flv|m4v)$/i);
    const isImage = selectedFile.type.startsWith('image/') || isHeic;

    if (isVideo) {
      setMode('video');
      setFile(selectedFile);
      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);

      // Try decoding audio track for instant extraction
      try {
        const arrayBuf = await selectedFile.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtx.decodeAudioData(
          arrayBuf,
          (buf) => setAudioBuffer(buf),
          () => setAudioBuffer(null)
        );
      } catch {
        setAudioBuffer(null);
      }
    } else if (isImage) {
      setMode('image');
      setFile(selectedFile);

      if (isHeic) {
        setIsHeicConverting(true);
        setStatusMessage(
          lang === 'tr'
            ? 'iPhone HEIC formatı algılandı, anında JPG formatına çevriliyor...'
            : lang === 'ar'
            ? 'تم اكتشاف صيغة iPhone HEIC، جاري التحويل إلى JPG...'
            : 'iPhone HEIC format detected, converting to JPG in browser...'
        );

        const loaded = await ensureHeicScript();
        if (loaded && (window as any).heic2any) {
          try {
            const blobResult: Blob | Blob[] = await (window as any).heic2any({
              blob: selectedFile,
              toType: 'image/jpeg',
              quality: 0.92,
            });
            const finalBlob = Array.isArray(blobResult) ? blobResult[0] : blobResult;
            const convertedUrl = URL.createObjectURL(finalBlob);
            setFileUrl(convertedUrl);
            loadImageToCanvas(convertedUrl);
            setIsHeicConverting(false);
            setStatusMessage(
              lang === 'tr'
                ? '✅ HEIC fotoğrafı başarıyla çözüldü ve düzenlemeye hazır!'
                : lang === 'ar'
                ? '✅ تم فك تشفير صورة HEIC بنجاح وجاهزة للتعديل!'
                : '✅ HEIC photo converted successfully and ready to edit!'
            );
            return;
          } catch (err) {
            console.error('HEIC conversion failed:', err);
            setIsHeicConverting(false);
          }
        }
        setIsHeicConverting(false);
      }

      // Standard image load
      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);
      loadImageToCanvas(url);
    }
  };

  const loadImageToCanvas = (url: string) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      setImageObj(img);
      setImageDimensions({ w: img.naturalWidth, h: img.naturalHeight });
      setCustomWidth(img.naturalWidth);
      setCustomHeight(img.naturalHeight);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
      renderCanvas(img, 0, false, false, 100, 100, 100, false, false, img.naturalWidth, img.naturalHeight);
    };
  };

  const renderCanvas = (
    img: HTMLImageElement,
    rot: number,
    fH: boolean,
    fV: boolean,
    bright: number,
    cont: number,
    sat: number,
    gray: boolean,
    sep: boolean,
    targetW: number,
    targetH: number
  ) => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const isRotated90or270 = rot % 180 !== 0;
    const finalW = isRotated90or270 ? targetH : targetW;
    const finalH = isRotated90or270 ? targetW : targetH;

    canvas.width = finalW;
    canvas.height = finalH;

    ctx.save();
    ctx.clearRect(0, 0, finalW, finalH);

    // Filter effects
    const filters: string[] = [];
    if (bright !== 100) filters.push(`brightness(${bright}%)`);
    if (cont !== 100) filters.push(`contrast(${cont}%)`);
    if (sat !== 100) filters.push(`saturate(${sat}%)`);
    if (gray) filters.push('grayscale(100%)');
    if (sep) filters.push('sepia(100%)');
    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

    // Transformations
    ctx.translate(finalW / 2, finalH / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(fH ? -1 : 1, fV ? -1 : 1);

    ctx.drawImage(img, -targetW / 2, -targetH / 2, targetW, targetH);
    ctx.restore();
  };

  // Re-render canvas whenever image transform parameters change
  useEffect(() => {
    if (imageObj && customWidth > 0 && customHeight > 0) {
      renderCanvas(
        imageObj,
        rotation,
        flipH,
        flipV,
        brightness,
        contrast,
        saturation,
        grayscale,
        sepia,
        customWidth,
        customHeight
      );
    }
  }, [imageObj, rotation, flipH, flipV, brightness, contrast, saturation, grayscale, sepia, customWidth, customHeight]);

  // Video metadata loaded
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setVideoDuration(dur);
      setTrimStart(0);
      setTrimEnd(Math.min(dur, 60)); // Default 60s or full duration
    }
  };

  // Video time update
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      const curr = videoRef.current.currentTime;
      setCurrentTime(curr);
      if (curr >= trimEnd) {
        videoRef.current.pause();
        setIsPlaying(false);
        videoRef.current.currentTime = trimStart;
      }
    }
  };

  // Play preview slice
  const playPreviewSlice = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = trimStart;
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.muted = muteAudio;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleVideoPlayback = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.muted = muteAudio;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Extract MP3 / Audio directly from AudioBuffer
  const handleExtractAudio = () => {
    if (!audioBuffer) {
      setStatusMessage(
        lang === 'tr'
          ? 'Bu videodan doğrudan ses kanalı alınamadı veya sessiz.'
          : 'Could not extract direct audio track from this video.'
      );
      return;
    }
    setIsProcessing(true);
    setStatusMessage(lang === 'tr' ? 'Ses ayıklanıyor ve WAV/MP3 olarak kodlanıyor...' : 'Extracting studio audio...');
    try {
      const wavBlob = sliceAudioBufferToWav(audioBuffer, trimStart, trimEnd);
      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vidnoria-studio-${Date.now()}.wav`;
      a.click();
      URL.revokeObjectURL(url);
      setIsProcessing(false);
      setStatusMessage(lang === 'tr' ? '✅ Ses başarıyla cihazınıza indirildi!' : '✅ Audio downloaded successfully!');
    } catch (err) {
      console.error(err);
      setIsProcessing(false);
      setStatusMessage(lang === 'tr' ? 'Ses çıkarma işlemi başarısız oldu.' : 'Failed to extract audio.');
    }
  };

  // Export processed video using MediaRecorder & Canvas
  const handleExportVideo = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setProgress(5);
    setStatusMessage(
      lang === 'tr'
        ? 'Video kareleri işleniyor ve tarayıcınızda paketleniyor...'
        : 'Rendering video frames in browser...'
    );

    const video = videoRef.current;
    const origW = video.videoWidth || 1280;
    const origH = video.videoHeight || 720;

    let targetW = origW;
    let targetH = origH;

    if (aspectRatio === '9:16') {
      targetH = Math.max(origH, Math.round((origW * 16) / 9));
      targetW = Math.round((targetH * 9) / 16);
    } else if (aspectRatio === '16:9') {
      targetW = Math.max(origW, Math.round((origH * 16) / 9));
      targetH = Math.round((targetW * 9) / 16);
    } else if (aspectRatio === '1:1') {
      const dim = Math.max(origW, origH);
      targetW = dim;
      targetH = dim;
    } else if (aspectRatio === '4:5') {
      targetH = Math.max(origH, Math.round((origW * 5) / 4));
      targetW = Math.round((targetH * 4) / 5);
    }

    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = targetW;
    renderCanvas.height = targetH;
    const rCtx = renderCanvas.getContext('2d');
    if (!rCtx) {
      setIsProcessing(false);
      return;
    }

    const stream = renderCanvas.captureStream(30);

    // Audio stream if not muted
    if (!muteAudio) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioCtx.createMediaElementSource(video);
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(dest);
        source.connect(audioCtx.destination);
        dest.stream.getAudioTracks().forEach((track) => stream.addTrack(track));
      } catch {
        // Continue without extra audio track
      }
    }

    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/mp4')
      ? 'video/mp4'
      : 'video/webm';

    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { mimeType: mime });
    } catch {
      recorder = new MediaRecorder(stream);
    }

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };

    recorder.onstop = () => {
      const finalBlob = new Blob(chunks, { type: mime });
      const dlUrl = URL.createObjectURL(finalBlob);
      const a = document.createElement('a');
      a.href = dlUrl;
      const ext = videoFormat === 'webm' ? 'webm' : 'mp4';
      a.download = `vidnoria-studio-cut.${ext}`;
      a.click();
      URL.revokeObjectURL(dlUrl);
      setIsProcessing(false);
      setProgress(100);
      setStatusMessage(lang === 'tr' ? '✅ Videonuz başarıyla oluşturuldu ve indirildi!' : '✅ Video downloaded successfully!');
    };

    recorder.start(100);
    video.currentTime = trimStart;
    video.muted = muteAudio;
    video.playbackRate = playbackSpeed;

    const sliceDuration = Math.max(0.1, trimEnd - trimStart);

    const drawInterval = setInterval(() => {
      if (video.currentTime >= trimEnd || video.paused) {
        clearInterval(drawInterval);
        if (recorder.state === 'recording') recorder.stop();
        video.pause();
        return;
      }

      // Background fill (black for letterboxing)
      rCtx.fillStyle = '#0a0e1a';
      rCtx.fillRect(0, 0, targetW, targetH);

      // Fit inside canvas preserving aspect ratio
      const scale = Math.min(targetW / origW, targetH / origH);
      const drawW = origW * scale;
      const drawH = origH * scale;
      const drawX = (targetW - drawW) / 2;
      const drawY = (targetH - drawH) / 2;

      rCtx.drawImage(video, drawX, drawY, drawW, drawH);

      const elapsed = video.currentTime - trimStart;
      const p = Math.min(99, Math.round((elapsed / sliceDuration) * 100));
      setProgress(p);
    }, 1000 / 30);

    video.play();
  };

  // Export processed photo
  const handleExportImage = () => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;

    setIsProcessing(true);
    setStatusMessage(lang === 'tr' ? 'Fotoğraf işleniyor ve dışa aktarılıyor...' : 'Processing image...');

    const mimeMap: Record<ImageFormat, string> = {
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      ico: 'image/png',
      bmp: 'image/bmp',
    };

    const mime = mimeMap[imageFormat] || 'image/jpeg';
    const qual = quality / 100;

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setIsProcessing(false);
          setStatusMessage(lang === 'tr' ? 'Görsel dönüştürme başarısız oldu.' : 'Conversion failed.');
          return;
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = imageFormat === 'jpg' ? 'jpg' : imageFormat;
        a.download = `vidnoria-studio-photo.${ext}`;
        a.click();
        URL.revokeObjectURL(url);

        setIsProcessing(false);
        setStatusMessage(
          lang === 'tr'
            ? `✅ Fotoğraf başarıyla ${imageFormat.toUpperCase()} formatında kaydedildi!`
            : `✅ Photo saved as ${imageFormat.toUpperCase()}!`
        );
      },
      mime,
      qual
    );
  };

  // Dimension aspect lock changes
  const handleWidthChange = (val: number) => {
    setCustomWidth(val);
    if (lockAspect && imageDimensions && imageDimensions.w > 0) {
      const ratio = imageDimensions.h / imageDimensions.w;
      setCustomHeight(Math.round(val * ratio));
    }
  };

  const handleHeightChange = (val: number) => {
    setCustomHeight(val);
    if (lockAspect && imageDimensions && imageDimensions.h > 0) {
      const ratio = imageDimensions.w / imageDimensions.h;
      setCustomWidth(Math.round(val * ratio));
    }
  };

  // Reset image filters
  const resetImageFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setGrayscale(false);
    setSepia(false);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
    if (imageDimensions) {
      setCustomWidth(imageDimensions.w);
      setCustomHeight(imageDimensions.h);
    }
  };

  // Format seconds to mm:ss.ms
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  // FAQ accordion toggle
  const toggleFaq = (idx: number) => {
    setOpenFaq(openFaq === idx ? null : idx);
  };

  const faqItems = [
    {
      q: {
        tr: 'iPhone HEIC fotoğrafları Windows veya webde nasıl açılır ve JPG yapılır?',
        en: 'How to open and convert iPhone HEIC photos to JPG?',
        ar: 'كيفية فتح وتحويل صور iPhone HEIC إلى JPG؟',
      },
      a: {
        tr: 'Apple cihazlarının varsayılan yüksek verimli fotoğraf formatı olan HEIC, Vidnoria Medya Stüdyosu tarafından tarayıcınızda otomatik olarak algılanır ve hiçbir ek program kurmadan anında kayıpsız JPG veya PNG formatına dönüştürülür.',
        en: 'HEIC is the default high-efficiency photo format on Apple devices. Vidnoria Media Studio automatically detects HEIC files in your browser and instantly converts them to lossless JPG or PNG with zero software installation.',
        ar: 'تعتبر صيغة HEIC الصيغة الافتراضية في أجهزة Apple. يتعرف استوديو فيدنوريا تلقائياً على ملفات HEIC في المتصفح ويحولها فوراً إلى JPG أو PNG بجودة عالية.',
      },
    },
    {
      q: {
        tr: 'Video kırparken veya süresini keserken görüntü kalitesi bozulur mu?',
        en: 'Does trimming a video degrade its quality?',
        ar: 'هل يؤدي قص الفيديو إلى تقليل جودته؟',
      },
      a: {
        tr: 'Hayır. Vidnoria Studio, videonun orijinal piksel çözünürlüğünü ve kare hızını korur. Kesilen zaman aralığı doğrudan tarayıcı donanım hızlandırıcısı ile işlenerek kristal netliğinde sunulur.',
        en: 'No. Vidnoria Studio preserves original pixel resolution and frame rates. Slices are rendered using native browser acceleration without artificial degradation.',
        ar: 'كلا، يحافظ استوديو فيدنوريا على دقة البكسل الأصلية ومعدل الإطارات بالكامل.',
      },
    },
    {
      q: {
        tr: 'Videodan sadece ses kanalını alıp MP3 / WAV olarak kaydedebilir miyim?',
        en: 'Can I extract only the audio track from a video as MP3 / WAV?',
        ar: 'هل يمكنني استخراج الصوت فقط من الفيديو بصيغة MP3 أو WAV؟',
      },
      a: {
        tr: 'Evet! "Sesi MP3 Olarak Çıkar" butonuna tıkladığınızda, video dosyası içindeki ses kanalı Web Audio API ile ayrıştırılır ve seçtiğiniz kırpma süresine göre anında stüdyo kalitesinde WAV/MP3 dosyası olarak indirilir.',
        en: 'Yes! Simply click "Extract Audio", and the audio stream is parsed via Web Audio API and exported directly as a studio-quality track according to your chosen trim range.',
        ar: 'نعم! بنقرة واحدة على "استخراج الصوت"، يتم فصل المسار الصوتي وتحميله بجودة استوديو عالية.',
      },
    },
    {
      q: {
        tr: 'Yüklediğim video ve fotoğraflar sunucunuza kaydediliyor mu? (Gizlilik & 0-Log)',
        en: 'Are uploaded files saved on your server? (Privacy & 0-Log)',
        ar: 'هل يتم حفظ الملفات المرفوعة على خوادمكم؟',
      },
      a: {
        tr: 'Kesinlikle hayır. Vidnoria Medya Stüdyosu %100 "Client-Side" (İstemci Taraflı) mimariye sahiptir. Dosyalarınız bilgisayarınızın veya telefonunuzun RAM belleğinde yerel olarak işlenir; hiçbir sunucuya yüklenmez ve üçüncü şahıslarla paylaşılmaz.',
        en: 'Absolutely not. Vidnoria Studio runs 100% client-side. Your media files are processed locally in your browser memory and never leave your device.',
        ar: 'بالتأكيد لا. يعمل الاستوديو محلياً بنسبة 100% داخل متصفحك ولا يتم رفع أي ملفات إلى الخوادم.',
      },
    },
    {
      q: {
        tr: 'Instagram Reels, TikTok ve YouTube Shorts için 9:16 dikey format ayarlanabilir mi?',
        en: 'Can I set 9:16 vertical aspect ratio for Instagram Reels, TikTok, and Shorts?',
        ar: 'هل يمكن ضبط أبعاد 9:16 لـ Reels و TikTok و Shorts؟',
      },
      a: {
        tr: 'Evet. Sosyal Medya Hazır Oranları menüsünden "9:16 Dikey" seçeneğini işaretleyerek yatay videolarınızı dikey hikaye ve Reels formatına otomatik uyumlu hale getirebilirsiniz.',
        en: 'Yes. Select the "9:16 Vertical" preset from the aspect ratio menu to fit horizontal videos for Reels, TikTok, and Shorts effortlessly.',
        ar: 'نعم. من خيارات أبعاد الفيديو، اختر 9:16 لملاءمة المقاطع تلقائياً مع Reels و TikTok.',
      },
    },
    {
      q: {
        tr: 'Herhangi bir dosya boyutu veya günlük düzenleme kotası var mı?',
        en: 'Is there any file size limit or daily usage quota?',
        ar: 'هل توجد حدود لحجم الملف أو استخدام يومي؟',
      },
      a: {
        tr: 'Vidnoria Stüdyo tamamen ücretsiz ve sınırsızdır. İstediğiniz kadar video veya görseli dilediğiniz sıklıkta kırpabilir, düzenleyebilir ve dönüştürebilirsiniz.',
        en: 'Vidnoria Studio is completely free with no usage caps. You can edit, trim, and convert as many media files as you need.',
        ar: 'الخدمة مجانية تماماً وبدون أي حدود للاستخدام اليومي.',
      },
    },
  ];

  // Schema.org structured data
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'Vidnoria Media Studio',
        url: `https://vidnoria.com/${lang}/studio`,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'All',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
        featureList: [
          'Browser-based video trimmer and cutter',
          'iPhone HEIC to JPG converter',
          'Direct audio and MP3 extraction',
          'Aspect ratio resizer for 9:16 Reels and TikTok',
          'Interactive photo crop, rotate and filters',
          '0-Log client-side privacy protection',
        ],
      },
      {
        '@type': 'HowTo',
        name:
          lang === 'tr'
            ? 'Vidnoria Medya Stüdyosu ile Video ve Fotoğraf Düzenleme'
            : 'How to Edit Video & Photos with Vidnoria Media Studio',
        step: [
          {
            '@type': 'HowToStep',
            position: 1,
            name: lang === 'tr' ? 'Medyayı Sürükleyin ve Bırakın' : 'Drag & Drop Media',
            text:
              lang === 'tr'
                ? 'Düzenlemek istediğiniz videoyu (MP4, MOV, WebM) veya fotoğrafı (HEIC, JPG, PNG) alana bırakın.'
                : 'Drop your video or photo file into the studio dropzone.',
          },
          {
            '@type': 'HowToStep',
            position: 2,
            name: lang === 'tr' ? 'Kırpın, Boyutlandırın ve Ayarlayın' : 'Trim, Resize & Adjust',
            text:
              lang === 'tr'
                ? 'Zaman çubuğundan başlangıç-bitiş süresini belirleyin, filtreleri uygulayın veya en-boy oranını seçin.'
                : 'Set your trim range, apply image filters, or pick social media aspect ratios.',
          },
          {
            '@type': 'HowToStep',
            position: 3,
            name: lang === 'tr' ? 'Dönüştürün ve Anında İndirin' : 'Convert & Download',
            text:
              lang === 'tr'
                ? 'Formatınızı seçin ve "Dışa Aktar ve İndir" butonuna tıklayarak dosyanızı filigransız olarak kaydedin.'
                : 'Select your target format and download your watermark-free file immediately.',
          },
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Schema.org Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Top Banner Ad */}
      <div className="container-custom py-3">
        <AdSlot slotId="studio-top-banner" format="horizontal" label="Stüdyo Üst Banner (728×90)" />
      </div>

      <div className="container-custom">
        {/* Navigation Breadcrumb */}
        <div className="pt-4 pb-2">
          <Link
            href={`/${lang}`}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
            <span>{lang === 'tr' ? 'Ana Sayfaya Dön' : lang === 'ar' ? 'العودة للرئيسية' : 'Back to Home'}</span>
          </Link>
        </div>

        {/* Hero Header */}
        <div className="max-w-4xl mx-auto text-center py-6 sm:py-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-4 shadow-sm animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {lang === 'tr'
                ? 'Hepsi Bir Arada Medya Stüdyosu'
                : lang === 'ar'
                ? 'استوديو الوسائط الشامل'
                : 'All-in-One Media Studio'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            <span className="gradient-text">
              {lang === 'tr'
                ? 'Video & Fotoğraf Sürükle-Bırak Düzenleyici'
                : lang === 'ar'
                ? 'محرر ومحول الفيديو والصور بالسحب والإفلات'
                : 'Drag & Drop Video & Photo Editor'}
            </span>
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {lang === 'tr'
              ? 'Videolarınızı saniyeler içinde kırpın, sesini ayırın, 9:16 Reels/TikTok boyutuna getirin; iPhone HEIC fotoğraflarınızı kayıpsız JPG yapın ve filtrelerle dönüştürün. Sıfır sunucu yükü, %100 gizli ve ücretsiz.'
              : lang === 'ar'
              ? 'قص مقاطع الفيديو واستخرج الصوت وحول صور iPhone HEIC إلى JPG وعدل الأبعاد في ثوانٍ. بدون برامج وبأمان تام.'
              : 'Trim videos, extract audio, resize for 9:16 Reels/TikTok, convert iPhone HEIC to JPG, and apply photo filters in seconds. 100% private in-browser editing.'}
          </p>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>{lang === 'tr' ? '%100 İstemci Taraflı (0-Log)' : '100% Client-Side (0-Log)'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Zap className="w-4 h-4" />
              <span>{lang === 'tr' ? '0 Saniye Kuyruk & Anında İndirme' : 'Zero Waiting Queue'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-500 font-medium">
              <FileCheck className="w-4 h-4" />
              <span>{lang === 'tr' ? 'Sıfır Filigran & Sınırsız Kullanım' : 'No Watermark'}</span>
            </div>
          </div>
        </div>

        {/* Studio Tool Selection Tabs */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex items-center justify-center p-1.5 bg-muted/60 backdrop-blur rounded-2xl border border-border max-w-md mx-auto shadow-inner">
            <button
              onClick={() => setMode('video')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                mode === 'video'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>{lang === 'tr' ? 'Video Stüdyosu' : lang === 'ar' ? 'استوديو الفيديو' : 'Video Studio'}</span>
            </button>
            <button
              onClick={() => setMode('image')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                mode === 'image'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>{lang === 'tr' ? 'Fotoğraf & HEIC Stüdyosu' : lang === 'ar' ? 'استوديو الصور و HEIC' : 'Photo & HEIC Studio'}</span>
            </button>
          </div>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div className="max-w-4xl mx-auto mb-8">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                processIncomingFile(e.dataTransfer.files[0]);
              }
            }}
            className={`relative rounded-3xl border-2 border-dashed transition-all p-8 sm:p-12 text-center cursor-pointer group ${
              isDragging
                ? 'border-primary bg-primary/10 scale-[1.01] shadow-xl'
                : 'border-border/80 hover:border-primary/60 bg-card/50 hover:bg-card/80'
            }`}
            onClick={() => {
              const el = document.getElementById('studio-file-input');
              if (el) el.click();
            }}
          >
            <input
              id="studio-file-input"
              type="file"
              className="hidden"
              accept={
                mode === 'video'
                  ? 'video/*,.mp4,.mov,.webm,.avi,.mkv'
                  : 'image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp'
              }
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processIncomingFile(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center justify-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all shadow-md">
                <Upload className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-lg sm:text-xl font-bold text-foreground mb-1">
                  {lang === 'tr'
                    ? mode === 'video'
                      ? 'Videonuzu Buraya Sürükleyin ve Bırakın'
                      : 'Fotoğraf veya iPhone HEIC Dosyanızı Buraya Bırakın'
                    : mode === 'video'
                    ? 'Drag and Drop Your Video File Here'
                    : 'Drag and Drop Photo or iPhone HEIC Here'}
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto">
                  {lang === 'tr'
                    ? mode === 'video'
                      ? 'MP4, MOV, WebM veya AVI formatlarını destekler. Dosyanız cihazınızdan çıkmadan işlenir.'
                      : 'JPG, PNG, WebP, BMP ve Apple iPhone HEIC/HEIF fotoğraflarını anında destekler.'
                    : 'Supports MP4, MOV, WebM, JPG, PNG, WebP, and Apple iPhone HEIC/HEIF files.'}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-muted hover:bg-accent text-foreground transition-all">
                <span>{lang === 'tr' ? 'veya Cihazınızdan Dosya Seçin' : 'or Browse From Device'}</span>
              </div>
            </div>
          </div>

          {/* Status / Alert Messages */}
          {statusMessage && (
            <div className="mt-4 p-4 rounded-2xl bg-primary/10 border border-primary/20 text-foreground text-sm flex items-center gap-3 animate-slide-up">
              <AlertCircle className="w-5 h-5 text-primary shrink-0" />
              <span className="flex-1 font-medium">{statusMessage}</span>
            </div>
          )}
        </div>

        {/* -------------------- VIDEO STUDIO WORKSPACE -------------------- */}
        {mode === 'video' && fileUrl && (
          <div className="max-w-4xl mx-auto glass-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xl mb-12 animate-fade-in">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Film className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground truncate max-w-xs sm:max-w-md">
                    {file?.name || 'video.mp4'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'tr' ? 'Toplam Süre:' : 'Duration:'} {formatTime(videoDuration)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setFile(null);
                  setFileUrl(null);
                  setStatusMessage(null);
                }}
                className="text-xs font-semibold text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'Yeni Video Yükle' : 'Change Video'}</span>
              </button>
            </div>

            {/* Video Player Preview */}
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center mb-6 shadow-inner">
              <video
                ref={videoRef}
                src={fileUrl}
                onLoadedMetadata={handleVideoLoadedMetadata}
                onTimeUpdate={handleVideoTimeUpdate}
                className="max-h-full max-w-full rounded-xl"
                playsInline
              />

              {/* Central Play/Pause Overlay */}
              <button
                onClick={toggleVideoPlayback}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all backdrop-blur-sm shadow-xl"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ms-1" />}
              </button>

              {/* Time display pill */}
              <div className="absolute bottom-3 end-3 px-3 py-1 bg-black/70 backdrop-blur rounded-lg text-white text-xs font-mono">
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </div>
            </div>

            {/* Trimmer Sliders */}
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Scissors className="w-4 h-4" />
                  <span>{lang === 'tr' ? 'Görsel Video Kırpma & Trim Aralığı' : 'Video Trimmer & Range'}</span>
                </div>
                <div className="text-xs font-mono font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                  {lang === 'tr' ? 'Seçilen Süre:' : 'Selected:'} {formatTime(Math.max(0, trimEnd - trimStart))}
                </div>
              </div>

              {/* Dual Range Sliders */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{lang === 'tr' ? 'Başlangıç Noktası:' : 'Start Point:'}</span>
                    <span className="font-mono font-bold text-foreground">{formatTime(trimStart)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, trimEnd - 0.5)}
                    step={0.1}
                    value={trimStart}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTrimStart(val);
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{lang === 'tr' ? 'Bitiş Noktası:' : 'End Point:'}</span>
                    <span className="font-mono font-bold text-foreground">{formatTime(trimEnd)}</span>
                  </div>
                  <input
                    type="range"
                    min={Math.min(videoDuration, trimStart + 0.5)}
                    max={videoDuration || 100}
                    step={0.1}
                    value={trimEnd}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setTrimEnd(val);
                      if (videoRef.current) videoRef.current.currentTime = val;
                    }}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground me-1">
                  {lang === 'tr' ? 'Hızlı Seçim:' : 'Presets:'}
                </span>
                <button
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(videoDuration);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent transition-colors"
                >
                  {lang === 'tr' ? 'Tamamı' : 'Full Video'}
                </button>
                <button
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(Math.min(videoDuration, 15));
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent transition-colors"
                >
                  {lang === 'tr' ? 'İlk 15 sn (Story)' : 'First 15s (Story)'}
                </button>
                <button
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(Math.min(videoDuration, 30));
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent transition-colors"
                >
                  {lang === 'tr' ? 'İlk 30 sn (Reels/Durum)' : 'First 30s (Reels)'}
                </button>
                <button
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(Math.min(videoDuration, 60));
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent transition-colors"
                >
                  {lang === 'tr' ? 'İlk 60 sn (Shorts)' : 'First 60s (Shorts)'}
                </button>
                <button
                  onClick={playPreviewSlice}
                  className="ms-auto px-3 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{lang === 'tr' ? 'Seçili Aralığı Oynat' : 'Play Sliced'}</span>
                </button>
              </div>
            </div>

            {/* Video Options Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {/* Aspect Ratio Preset */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <label className="block text-xs font-bold text-foreground mb-2">
                  {lang === 'tr' ? 'Sosyal Medya Formatı (Oran)' : 'Aspect Ratio'}
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as VideoAspectRatio)}
                  className="w-full py-2 px-3 rounded-xl bg-card border border-border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="original">{lang === 'tr' ? 'Orijinal Oran' : 'Original Ratio'}</option>
                  <option value="9:16">9:16 (Reels, TikTok, Shorts)</option>
                  <option value="16:9">16:9 (YouTube, Geniş Ekran)</option>
                  <option value="1:1">1:1 (Kare Instagram Gönderisi)</option>
                  <option value="4:5">4:5 (Dikey Instagram Post)</option>
                </select>
              </div>

              {/* Speed Controller */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <label className="block text-xs font-bold text-foreground mb-2">
                  {lang === 'tr' ? 'Oynatma & Çıktı Hızı' : 'Speed Multiplier'}
                </label>
                <select
                  value={playbackSpeed}
                  onChange={(e) => {
                    const spd = parseFloat(e.target.value);
                    setPlaybackSpeed(spd);
                    if (videoRef.current) videoRef.current.playbackRate = spd;
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-card border border-border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="0.5">0.5x ({lang === 'tr' ? 'Ağır Çekim' : 'Slow Motion'})</option>
                  <option value="0.75">0.75x</option>
                  <option value="1">1.0x ({lang === 'tr' ? 'Normal' : 'Normal'})</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x ({lang === 'tr' ? 'Hızlı' : 'Fast'})</option>
                  <option value="2">2.0x ({lang === 'tr' ? '2 Kat Hızlı' : '2x Speed'})</option>
                </select>
              </div>

              {/* Audio Controls */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border flex flex-col justify-between">
                <label className="block text-xs font-bold text-foreground mb-2">
                  {lang === 'tr' ? 'Ses Kanalı Ayarları' : 'Audio Channel'}
                </label>
                <button
                  onClick={() => {
                    const next = !muteAudio;
                    setMuteAudio(next);
                    if (videoRef.current) videoRef.current.muted = next;
                  }}
                  className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    muteAudio
                      ? 'bg-rose-500/10 text-rose-500 border-rose-500/30'
                      : 'bg-card text-foreground border-border hover:bg-accent'
                  }`}
                >
                  {muteAudio ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  <span>{muteAudio ? (lang === 'tr' ? 'Sesi Kapatıldı (Muted)' : 'Muted') : (lang === 'tr' ? 'Sesi Açık (Sesli)' : 'Audio Active')}</span>
                </button>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-border">
              {/* Extract Audio Button */}
              <button
                onClick={handleExtractAudio}
                disabled={isProcessing}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Music className="w-4 h-4" />
                <span>{lang === 'tr' ? 'Videonun Sesini MP3 Olarak Çıkar' : 'Extract Audio Track (MP3/WAV)'}</span>
              </button>

              {/* Export Trimmed Video Button */}
              <button
                onClick={handleExportVideo}
                disabled={isProcessing}
                className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'tr' ? `İşleniyor (${progress}%)...` : `Processing (${progress}%)...`}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      {lang === 'tr'
                        ? 'Kırpılmış Videoyu İndir (MP4/WebM)'
                        : 'Export & Download Video'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* -------------------- PHOTO & HEIC STUDIO WORKSPACE -------------------- */}
        {mode === 'image' && fileUrl && (
          <div className="max-w-4xl mx-auto glass-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xl mb-12 animate-fade-in">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground truncate max-w-xs sm:max-w-md">
                    {file?.name || 'photo.jpg'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {imageDimensions ? `${imageDimensions.w} × ${imageDimensions.h} px` : ''}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setFile(null);
                  setFileUrl(null);
                  setImageObj(null);
                  setStatusMessage(null);
                }}
                className="text-xs font-semibold text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'Yeni Fotoğraf Yükle' : 'Change Photo'}</span>
              </button>
            </div>

            {/* Live Interactive Canvas */}
            <div className="relative rounded-2xl overflow-hidden bg-black/5 dark:bg-black/40 border border-border p-4 flex items-center justify-center mb-6 min-h-[300px]">
              <canvas ref={imageCanvasRef} className="max-h-[420px] max-w-full rounded-xl shadow-lg object-contain" />
              {isHeicConverting && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs font-bold text-foreground">
                    {lang === 'tr' ? 'iPhone HEIC fotoğrafı dönüştürülüyor...' : 'Converting iPhone HEIC...'}
                  </p>
                </div>
              )}
            </div>

            {/* Transformation Controls Toolbar */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 p-3 rounded-2xl bg-muted/40 border border-border">
              <button
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                className="px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-accent text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="90° Sola Döndür"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? '90° Sola' : 'Rotate -90°'}</span>
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-accent text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                title="90° Sağa Döndür"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? '90° Sağa' : 'Rotate +90°'}</span>
              </button>
              <button
                onClick={() => setFlipH((f) => !f)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                  flipH ? 'bg-primary text-white border-primary' : 'bg-card border-border hover:bg-accent'
                }`}
                title="Yatay Aynala"
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'Yatay Çevir' : 'Flip H'}</span>
              </button>
              <button
                onClick={() => setFlipV((f) => !f)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                  flipV ? 'bg-primary text-white border-primary' : 'bg-card border-border hover:bg-accent'
                }`}
                title="Dikey Aynala"
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'Dikey Çevir' : 'Flip V'}</span>
              </button>
              <button
                onClick={resetImageFilters}
                className="px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all ms-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'Sıfırla' : 'Reset'}</span>
              </button>
            </div>

            {/* Sliders Grid: Brightness, Contrast, Saturation */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-foreground">{lang === 'tr' ? 'Parlaklık' : 'Brightness'}</span>
                  <span className="font-mono text-muted-foreground">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-foreground">{lang === 'tr' ? 'Kontrast' : 'Contrast'}</span>
                  <span className="font-mono text-muted-foreground">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={150}
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-foreground">{lang === 'tr' ? 'Doygunluk' : 'Saturation'}</span>
                  <span className="font-mono text-muted-foreground">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  value={saturation}
                  onChange={(e) => setSaturation(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Resize & Format Export Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {/* Dimensions */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <label className="block text-xs font-bold text-foreground mb-2">
                  {lang === 'tr' ? 'Boyutlandırma (Genişlik × Yükseklik)' : 'Resize (Width × Height)'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={customWidth}
                    onChange={(e) => handleWidthChange(parseInt(e.target.value) || 0)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-card border border-border text-xs font-mono"
                    placeholder="W"
                  />
                  <span className="text-muted-foreground">×</span>
                  <input
                    type="number"
                    value={customHeight}
                    onChange={(e) => handleHeightChange(parseInt(e.target.value) || 0)}
                    className="w-full py-1.5 px-2.5 rounded-lg bg-card border border-border text-xs font-mono"
                    placeholder="H"
                  />
                </div>
                <label className="flex items-center gap-1.5 mt-2 text-[11px] text-muted-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lockAspect}
                    onChange={(e) => setLockAspect(e.target.checked)}
                    className="rounded accent-primary"
                  />
                  <span>{lang === 'tr' ? 'En-boy oranını kilitle' : 'Lock aspect ratio'}</span>
                </label>
              </div>

              {/* Target Format */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <label className="block text-xs font-bold text-foreground mb-2">
                  {lang === 'tr' ? 'Hedef Format Çıktısı' : 'Export Format'}
                </label>
                <select
                  value={imageFormat}
                  onChange={(e) => setImageFormat(e.target.value as ImageFormat)}
                  className="w-full py-2 px-3 rounded-xl bg-card border border-border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="jpg">JPG / JPEG ({lang === 'tr' ? 'Standart Fotoğraf' : 'Standard Photo'})</option>
                  <option value="png">PNG ({lang === 'tr' ? 'Kayıpsız / Şeffaflık' : 'Lossless & Transparency'})</option>
                  <option value="webp">WebP ({lang === 'tr' ? 'Modern Web Formatı' : 'Web Optimized'})</option>
                  <option value="ico">ICO ({lang === 'tr' ? '64×64 Web Favicon' : 'Favicon Icon'})</option>
                  <option value="bmp">BMP (Bitmap)</option>
                </select>
              </div>

              {/* Quality Slider */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <div className="flex justify-between text-xs mb-2">
                  <span className="font-bold text-foreground">{lang === 'tr' ? 'Görsel Kalitesi' : 'Quality'}</span>
                  <span className="font-mono text-muted-foreground">%{quality}</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={5}
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer mb-2"
                />
                <p className="text-[11px] text-muted-foreground">
                  {quality > 85 ? (lang === 'tr' ? 'Yüksek Kalite / Düşük Sıkıştırma' : 'High Quality') : (lang === 'tr' ? 'Kompakt Dosya Boyutu' : 'Compressed Size')}
                </p>
              </div>
            </div>

            {/* Download Button */}
            <div className="pt-4 border-t border-border">
              <button
                onClick={handleExportImage}
                disabled={isProcessing}
                className="w-full py-3 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'tr' ? 'Dışa Aktarılıyor...' : 'Exporting...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      {lang === 'tr'
                        ? `İşlenmiş Fotoğrafı İndir (${imageFormat.toUpperCase()})`
                        : `Download Processed Photo (${imageFormat.toUpperCase()})`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Mid-Page AdSlot */}
        <div className="py-4">
          <AdSlot slotId="studio-mid-banner" format="horizontal" label="Stüdyo Orta Banner (728×90)" />
        </div>

        {/* -------------------- DEEP-DIVE SEO & E-E-A-T CONTENT -------------------- */}
        <section className="mt-12 pt-10 border-t border-border">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3">
              {lang === 'tr'
                ? 'Vidnoria Medya Stüdyosu Mühendislik Mimarisi & E-E-A-T Standartları'
                : 'Vidnoria Media Studio Engineering Architecture & Standards'}
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              {lang === 'tr'
                ? 'Geleneksel web sitelerinin aksine, Vidnoria dosyalarınızı uzak sunuculara yüklemez. Modern WebAssembly, Canvas ve Web Audio API çekirdeğimiz sayesinde medyanız doğrudan cihazınızın işlemcisinde ışık hızında işlenir.'
                : 'Unlike legacy web tools, Vidnoria never sends your files to remote servers. All operations run directly in your local browser runtime.'}
            </p>
          </div>

          {/* Technical Comparison Matrix Table */}
          <div className="glass-card rounded-3xl p-6 sm:p-8 border border-border shadow-xl mb-12 overflow-x-auto">
            <div className="text-start mb-4">
              <h3 className="text-lg font-bold text-foreground">
                {lang === 'tr'
                  ? 'Teknik Karşılaştırma Matrisi: Vidnoria Studio vs Ağır Masaüstü Yazılımları vs Ücretli Web Siteleri'
                  : 'Technical Comparison: Vidnoria Studio vs Desktop Software vs Paid Web Tools'}
              </h3>
            </div>

            <table className="w-full text-xs sm:text-sm text-start border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-muted-foreground">
                  <th className="py-3 px-4 font-bold text-start">{lang === 'tr' ? 'Kriter / Özellik' : 'Feature'}</th>
                  <th className="py-3 px-4 font-bold text-start text-primary">Vidnoria Medya Stüdyosu</th>
                  <th className="py-3 px-4 font-bold text-start">{lang === 'tr' ? 'Ağır Masaüstü Programları' : 'Desktop Apps'}</th>
                  <th className="py-3 px-4 font-bold text-start">{lang === 'tr' ? 'Standart Web Siteleri' : 'Paid Web Sites'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground">{lang === 'tr' ? 'Kurulum & Donanım Şartı' : 'Installation'}</td>
                  <td className="py-3.5 px-4 text-emerald-500 font-bold">{lang === 'tr' ? '0 Kurulum (Tarayıcıda Anında)' : 'Zero Install'}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{lang === 'tr' ? '10+ GB İndirme & Güçlü PC Şart' : 'Heavy Install'}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{lang === 'tr' ? 'Tarayıcıda' : 'Browser'}</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground">{lang === 'tr' ? 'Gizlilik & Güvenlik (0-Log)' : 'Privacy (0-Log)'}</td>
                  <td className="py-3.5 px-4 text-emerald-500 font-bold">{lang === 'tr' ? '%100 Yerel RAM (Sunucuya Gitmez)' : '100% Local RAM'}</td>
                  <td className="py-3.5 px-4 text-emerald-500 font-semibold">{lang === 'tr' ? 'Yerel' : 'Local'}</td>
                  <td className="py-3.5 px-4 text-rose-500">{lang === 'tr' ? 'Uzak Sunucuda Saklanabilir' : 'Server Uploaded'}</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground">{lang === 'tr' ? 'Filigran (Watermark)' : 'Watermark'}</td>
                  <td className="py-3.5 px-4 text-emerald-500 font-bold">{lang === 'tr' ? 'Kesinlikle Sıfır Filigran' : 'Zero Watermark'}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{lang === 'tr' ? 'Lisanslıysa Yok' : 'Licensed only'}</td>
                  <td className="py-3.5 px-4 text-rose-500">{lang === 'tr' ? 'Büyük Logo/Filigran Basar' : 'Leaves Logo'}</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground">{lang === 'tr' ? 'İşlem Hızı & Kuyruk' : 'Queue & Speed'}</td>
                  <td className="py-3.5 px-4 text-emerald-500 font-bold">{lang === 'tr' ? '0 Saniye Gecikme (Anında)' : 'Instant'}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{lang === 'tr' ? 'Uzun Render Bekletir' : 'Long Render'}</td>
                  <td className="py-3.5 px-4 text-rose-500">{lang === 'tr' ? 'Kuyrukta Sıra Bekletir' : 'Queue Waiting'}</td>
                </tr>
                <tr>
                  <td className="py-3.5 px-4 font-semibold text-foreground">{lang === 'tr' ? 'Ücretlendirme & Kota' : 'Pricing'}</td>
                  <td className="py-3.5 px-4 text-emerald-500 font-bold">{lang === 'tr' ? 'Tamamen Ücretsiz & Sınırsız' : '100% Free & Unlimited'}</td>
                  <td className="py-3.5 px-4 text-muted-foreground">{lang === 'tr' ? 'Yüksek Aylık Abonelik' : 'Paid Subscription'}</td>
                  <td className="py-3.5 px-4 text-rose-500">{lang === 'tr' ? 'Günlük 1-2 Dosya Sınırı' : 'Limited Free Tier'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 6 Semantic LSI Content Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <div className="glass-card p-5 sm:p-6 rounded-2xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Scissors className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">
                {lang === 'tr' ? 'Online Video Kırpma ve Trim İşlemi' : 'Online Video Trimming & Cutting'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {lang === 'tr'
                  ? 'Gereksiz giriş veya kapanış sahnelerini kaldırmak için çift kollu kaydırıcı ile başlangıç ve bitiş zamanını milisaniyelik hassasiyetle seçin. Video boyutu düşerken netlik korunur.'
                  : 'Remove unwanted intro or outro scenes with millisecond precision slider controls without re-encoding quality degradation.'}
              </p>
            </div>

            <div className="glass-card p-5 sm:p-6 rounded-2xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">
                {lang === 'tr' ? 'iPhone HEIC to JPG / PNG Dönüştürücü' : 'iPhone HEIC to JPG Converter'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {lang === 'tr'
                  ? 'Apple cihazların çektiği .heic fotoğraflarını Windows ve Android cihazlarda sorunsuz görüntülemek için anında standart JPG veya şeffaf PNG formatına dönüştürün.'
                  : 'Convert Apple High-Efficiency HEIC photos instantly into universal JPG and PNG formats readable on all devices.'}
              </p>
            </div>

            <div className="glass-card p-5 sm:p-6 rounded-2xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-3">
                <Music className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">
                {lang === 'tr' ? 'Videodan Ses Çıkarma (MP3 / WAV)' : 'Extract Audio from Video'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {lang === 'tr'
                  ? 'Klip veya konferans videolarındaki konuşma ve müzikleri ayrı bir ses parçası olarak ayıklayın. Web Audio API tabanlı motorumuz stüdyo berraklığında ses çıktısı üretir.'
                  : 'Extract background songs, speeches, or sound effects directly from video files with crystal-clear audio fidelty.'}
              </p>
            </div>

            <div className="glass-card p-5 sm:p-6 rounded-2xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-3">
                <Sliders className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">
                {lang === 'tr' ? '9:16 Reels, TikTok ve Shorts Boyutlandırma' : '9:16 Social Media Resizer'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {lang === 'tr'
                  ? 'Yatay videolarınızı dikey ekranlara uyarlayın. Hazır en-boy oranı önayarlarıyla sosyal medya algoritmalarının tam istediği piksel standartlarında içerik üretin.'
                  : 'Adapt horizontal clips for vertical mobile feeds like Instagram Reels, TikTok, and YouTube Shorts with optimal ratios.'}
              </p>
            </div>

            <div className="glass-card p-5 sm:p-6 rounded-2xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">
                {lang === 'tr' ? 'Görsel Boyutu Küçültme & KB Sıkıştırma' : 'Image KB Compression'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {lang === 'tr'
                  ? 'E-posta, pasaport başvuruları veya web siteleri için fotoğraf boyutunu kalite kaybetmeden KB düzeyine indirin. Genişlik ve yükseklik değerlerini özgürce ayarlayın.'
                  : 'Shrink photo file sizes down to required KB limits while maintaining crisp visual clarity.'}
              </p>
            </div>

            <div className="glass-card p-5 sm:p-6 rounded-2xl border border-border">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center mb-3">
                <RotateCw className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-foreground mb-2">
                {lang === 'tr' ? 'Hızlı Döndürme, Aynalama & Filtreler' : 'Rotate, Flip & Live Filters'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {lang === 'tr'
                  ? 'Ters çekilmiş fotoğrafları tek tıkla 90° çevirin, yatay/dikey aynalayın, parlaklık, kontrast ve doygunluk ayarlarıyla profesyonel görünüm kazandırın.'
                  : 'Fix inverted orientations, mirror horizontally or vertically, and fine-tune contrast, brightness, and color saturation.'}
              </p>
            </div>
          </div>

          {/* Sıkça Sorulan Sorular (FAQ Accordion) */}
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-primary mb-2">
                <HelpCircle className="w-4 h-4" />
                <span>{lang === 'tr' ? 'Merak Edilenler' : 'FAQ'}</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                {lang === 'tr' ? 'Sıkça Sorulan Sorular' : 'Frequently Asked Questions'}
              </h3>
            </div>

            <div className="space-y-3">
              {faqItems.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl border border-border bg-card/60 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full p-4 sm:p-5 text-start font-bold text-xs sm:text-sm text-foreground flex items-center justify-between gap-4 hover:bg-accent/50 transition-colors"
                  >
                    <span>{item.q[lang] || item.q.tr}</span>
                    {openFaq === idx ? (
                      <ChevronUp className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {openFaq === idx && (
                    <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3 animate-fade-in">
                      {item.a[lang] || item.a.tr}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bottom Banner Ad */}
        <div className="container-custom pt-12">
          <AdSlot slotId="studio-bottom-banner" format="horizontal" label="Stüdyo Alt Banner (728×90)" />
        </div>
      </div>
    </div>
  );
}
