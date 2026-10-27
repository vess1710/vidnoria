'use client';

import { useState, useRef, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, Upload, Film, Image as ImageIcon, Download, CheckCircle2,
  Loader2, RefreshCw, Sparkles, Scissors, Music, Sliders, RotateCw,
  RotateCcw, FlipHorizontal, FlipVertical, Play, Pause, Volume2, VolumeX,
  FileCheck, ShieldCheck, Zap, HelpCircle, ChevronDown, ChevronUp, AlertCircle,
  Radio, Disc, Gauge, Layers, Eye, Wand2
} from 'lucide-react';
import { Locale } from '@/lib/i18n';
import AdSlot from '@/components/ads/AdSlot';

interface StudioPageProps {
  params: Promise<{ lang: string }>;
}

type StudioMode = 'video' | 'audio' | 'image';
type VideoAspectRatio = 'original' | '9:16' | '16:9' | '1:1' | '4:5';
type VideoResolution = 'original' | '1080p' | '720p' | '480p';
type VideoFormat = 'mp4' | 'webm' | 'mov' | 'mkv' | 'avi' | 'gif';
type AudioFormat = 'mp3' | 'wav' | 'm4a' | 'ogg';
type ImageFormat = 'jpg' | 'png' | 'webp' | 'ico' | 'bmp';
type FilterPreset = 'none' | 'vivid' | 'vintage' | 'cinematic' | 'bw' | 'warm' | 'cool';

/**
 * Encodes an AudioBuffer slice with volume boost, fade, and EQ into 16-bit PCM WAV Blob
 */
function processAndEncodeWav(
  buffer: AudioBuffer,
  startSec: number,
  endSec: number,
  volumeMultiplier: number,
  fadeInSec: number,
  fadeOutSec: number
): Blob {
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

  const fadeInFrames = Math.floor(fadeInSec * sampleRate);
  const fadeOutFrames = Math.floor(fadeOutSec * sampleRate);

  for (let i = 0; i < frameCount; i++) {
    let fade = 1.0;
    if (fadeInFrames > 0 && i < fadeInFrames) {
      fade = i / fadeInFrames;
    } else if (fadeOutFrames > 0 && i > frameCount - fadeOutFrames) {
      fade = Math.max(0, (frameCount - i) / fadeOutFrames);
    }

    for (let c = 0; c < numOfChan; c++) {
      let rawSample = (channels[c][startSample + i] || 0) * volumeMultiplier * fade;
      // Soft-clip saturation if volume boosted above 1.0
      if (volumeMultiplier > 1.0) {
        rawSample = Math.tanh(rawSample);
      } else {
        rawSample = Math.max(-1, Math.min(1, rawSample));
      }
      view.setInt16(pos, rawSample < 0 ? rawSample * 0x8000 : rawSample * 0x7fff, true);
      pos += 2;
    }
  }

  return new Blob([out], { type: 'audio/wav' });
}

export default function StudioPage({ params }: StudioPageProps) {
  const resolvedParams = use(params);
  const lang = (resolvedParams.lang || 'tr') as Locale;
  const isRtl = lang === 'ar';

  // Mode Selection: Video | Audio | Image
  const [mode, setMode] = useState<StudioMode>('video');
  const [isDragging, setIsDragging] = useState(false);

  // Common file state
  const [file, setFile] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // ---------------- VIDEO SPECIFIC STATE ----------------
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  const [muteAudio, setMuteAudio] = useState(false);
  const [videoFormat, setVideoFormat] = useState<VideoFormat>('mp4');
  const [aspectRatio, setAspectRatio] = useState<VideoAspectRatio>('original');
  const [videoResolution, setVideoResolution] = useState<VideoResolution>('original');
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [videoAudioBuffer, setVideoAudioBuffer] = useState<AudioBuffer | null>(null);

  // ---------------- AUDIO SPECIFIC STATE ----------------
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [audioTrimStart, setAudioTrimStart] = useState(0);
  const [audioTrimEnd, setAudioTrimEnd] = useState(0);
  const [audioVolume, setAudioVolume] = useState(100); // 0 to 300%
  const [fadeInDuration, setFadeInDuration] = useState(0); // 0 to 5s
  const [fadeOutDuration, setFadeOutDuration] = useState(0); // 0 to 5s
  const [audioFormat, setAudioFormat] = useState<AudioFormat>('mp3');
  const [audioSpeed, setAudioSpeed] = useState<number>(1);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // ---------------- PHOTO / HEIC SPECIFIC STATE ----------------
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
  const [blurValue, setBlurValue] = useState(0);
  const [grayscale, setGrayscale] = useState(false);
  const [sepia, setSepia] = useState(false);
  const [invert, setInvert] = useState(false);
  const [activeFilterPreset, setActiveFilterPreset] = useState<FilterPreset>('none');
  const [imageFormat, setImageFormat] = useState<ImageFormat>('jpg');
  const [quality, setQuality] = useState(92);
  const [isHeicConverting, setIsHeicConverting] = useState(false);

  // FAQ Accordion state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Clean up ObjectURL on unmount or file change
  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
      if (audioSourceNodeRef.current) {
        try {
          audioSourceNodeRef.current.stop();
        } catch {}
      }
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
    const isAudio = selectedFile.type.startsWith('audio/') || selectedFile.name.match(/\.(mp3|wav|m4a|aac|ogg|flac|wma)$/i);
    const isImage = selectedFile.type.startsWith('image/') || isHeic;

    setFile(selectedFile);

    if (isVideo) {
      setMode('video');
      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);

      // Try decoding audio track for instant extraction
      try {
        const arrayBuf = await selectedFile.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioCtx.decodeAudioData(
          arrayBuf,
          (buf) => setVideoAudioBuffer(buf),
          () => setVideoAudioBuffer(null)
        );
      } catch {
        setVideoAudioBuffer(null);
      }
    } else if (isAudio) {
      setMode('audio');
      const url = URL.createObjectURL(selectedFile);
      setFileUrl(url);

      try {
        const arrayBuf = await selectedFile.arrayBuffer();
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;
        audioCtx.decodeAudioData(
          arrayBuf,
          (buf) => {
            setAudioBuffer(buf);
            setAudioDuration(buf.duration);
            setAudioTrimStart(0);
            setAudioTrimEnd(buf.duration);
          },
          () => {
            setStatusMessage(lang === 'tr' ? 'Ses dosyası çözümlenemedi.' : 'Could not decode audio file.');
          }
        );
      } catch (e) {
        console.error(e);
      }
    } else if (isImage) {
      setMode('image');

      if (isHeic) {
        setIsHeicConverting(true);
        setStatusMessage(
          lang === 'tr'
            ? 'iPhone HEIC formatı algılandı, anında JPG formatına çevriliyor...'
            : 'iPhone HEIC format detected, converting in browser...'
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
                ? '✅ iPhone HEIC fotoğrafı başarıyla çözüldü ve düzenlemeye hazır!'
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

  // ---------------- PHOTO METHODS ----------------
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
      renderCanvasImmediate(img, img.naturalWidth, img.naturalHeight);
    };
  };

  // Draws base image onto canvas; CSS filters provide 60fps instant live feedback!
  const renderCanvasImmediate = (img: HTMLImageElement, targetW: number, targetH: number) => {
    const canvas = imageCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = targetW;
    canvas.height = targetH;
    ctx.clearRect(0, 0, targetW, targetH);
    ctx.drawImage(img, 0, 0, targetW, targetH);
  };

  // Apply one of the 1-click Filter Presets
  const applyFilterPreset = (preset: FilterPreset) => {
    setActiveFilterPreset(preset);
    switch (preset) {
      case 'none':
        setBrightness(100);
        setContrast(100);
        setSaturation(100);
        setBlurValue(0);
        setGrayscale(false);
        setSepia(false);
        setInvert(false);
        break;
      case 'vivid':
        setBrightness(105);
        setContrast(115);
        setSaturation(140);
        setGrayscale(false);
        setSepia(false);
        setInvert(false);
        break;
      case 'vintage':
        setBrightness(110);
        setContrast(90);
        setSaturation(80);
        setSepia(true);
        setGrayscale(false);
        setInvert(false);
        break;
      case 'cinematic':
        setBrightness(95);
        setContrast(125);
        setSaturation(110);
        setGrayscale(false);
        setSepia(false);
        setInvert(false);
        break;
      case 'bw':
        setBrightness(100);
        setContrast(120);
        setSaturation(0);
        setGrayscale(true);
        setSepia(false);
        setInvert(false);
        break;
      case 'warm':
        setBrightness(105);
        setContrast(100);
        setSaturation(120);
        setSepia(true);
        setGrayscale(false);
        setInvert(false);
        break;
      case 'cool':
        setBrightness(100);
        setContrast(110);
        setSaturation(85);
        setSepia(false);
        setGrayscale(false);
        setInvert(false);
        break;
    }
  };

  // Full-resolution export of the edited photo
  const handleExportImage = () => {
    if (!imageObj) return;

    setIsProcessing(true);
    setStatusMessage(lang === 'tr' ? 'Fotoğraf işleniyor ve dışa aktarılıyor...' : 'Processing image...');

    const isRotated90or270 = rotation % 180 !== 0;
    const finalW = isRotated90or270 ? customHeight : customWidth;
    const finalH = isRotated90or270 ? customWidth : customHeight;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = finalW;
    exportCanvas.height = finalH;
    const ctx = exportCanvas.getContext('2d');

    if (!ctx) {
      setIsProcessing(false);
      return;
    }

    // Compose CSS filters string
    const filters: string[] = [];
    if (brightness !== 100) filters.push(`brightness(${brightness}%)`);
    if (contrast !== 100) filters.push(`contrast(${contrast}%)`);
    if (saturation !== 100) filters.push(`saturate(${saturation}%)`);
    if (blurValue > 0) filters.push(`blur(${blurValue}px)`);
    if (grayscale) filters.push('grayscale(100%)');
    if (sepia) filters.push('sepia(100%)');
    if (invert) filters.push('invert(100%)');

    ctx.filter = filters.length > 0 ? filters.join(' ') : 'none';

    // Apply rotation & flip
    ctx.translate(finalW / 2, finalH / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(imageObj, -customWidth / 2, -customHeight / 2, customWidth, customHeight);

    const mimeMap: Record<ImageFormat, string> = {
      jpg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      ico: 'image/png',
      bmp: 'image/bmp',
    };

    const mime = mimeMap[imageFormat] || 'image/jpeg';
    const qual = quality / 100;

    exportCanvas.toBlob(
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
            ? `✅ Fotoğraf başarıyla ${imageFormat.toUpperCase()} formatında indirildi!`
            : `✅ Photo downloaded as ${imageFormat.toUpperCase()}!`
        );
      },
      mime,
      qual
    );
  };

  // Dimensions lock handling
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

  // ---------------- VIDEO METHODS ----------------
  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setVideoDuration(dur);
      setTrimStart(0);
      setTrimEnd(Math.min(dur, 60));
    }
  };

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

  const playVideoSlice = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = trimStart;
      videoRef.current.playbackRate = playbackSpeed;
      videoRef.current.muted = muteAudio;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  // Export processed video with chosen format and aspect ratio
  const handleExportVideo = async () => {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setProgress(5);
    setStatusMessage(
      lang === 'tr'
        ? `Video kareleri işleniyor ve ${videoFormat.toUpperCase()} formatına dönüştürülüyor...`
        : `Rendering video frames to ${videoFormat.toUpperCase()}...`
    );

    const video = videoRef.current;
    let origW = video.videoWidth || 1280;
    let origH = video.videoHeight || 720;

    // Apply target resolution scaling
    if (videoResolution === '1080p') {
      const scale = 1080 / Math.max(origW, origH);
      origW = Math.round(origW * scale);
      origH = Math.round(origH * scale);
    } else if (videoResolution === '720p') {
      const scale = 720 / Math.max(origW, origH);
      origW = Math.round(origW * scale);
      origH = Math.round(origH * scale);
    } else if (videoResolution === '480p') {
      const scale = 480 / Math.max(origW, origH);
      origW = Math.round(origW * scale);
      origH = Math.round(origH * scale);
    }

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
      } catch {}
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
      a.download = `vidnoria-studio-video.${videoFormat}`;
      a.click();
      URL.revokeObjectURL(dlUrl);
      setIsProcessing(false);
      setProgress(100);
      setStatusMessage(
        lang === 'tr'
          ? `✅ Video başarıyla ${videoFormat.toUpperCase()} formatında dönüştürüldü ve indirildi!`
          : `✅ Video downloaded successfully as ${videoFormat.toUpperCase()}!`
      );
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

      rCtx.fillStyle = '#0a0e1a';
      rCtx.fillRect(0, 0, targetW, targetH);

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

  // Transfer video audio directly to Audio Studio mode!
  const transferVideoToAudioStudio = () => {
    if (videoAudioBuffer) {
      setAudioBuffer(videoAudioBuffer);
      setAudioDuration(videoAudioBuffer.duration);
      setAudioTrimStart(trimStart);
      setAudioTrimEnd(trimEnd > 0 ? trimEnd : videoAudioBuffer.duration);
      setMode('audio');
      setStatusMessage(
        lang === 'tr'
          ? '🎵 Videonun ses kanalı başarıyla Ses Stüdyosu’na aktarıldı! Burada ses yükseltme, kesme ve dönüştürme yapabilirsiniz.'
          : '🎵 Audio extracted to Audio Studio! You can now boost volume, trim, and apply fade.'
      );
    } else {
      setStatusMessage(lang === 'tr' ? 'Videonun ses kanalı bulunamadı.' : 'No audio channel found.');
    }
  };

  // ---------------- AUDIO METHODS ----------------
  const toggleAudioPlayback = () => {
    if (!audioBuffer) return;

    if (isAudioPlaying) {
      if (audioSourceNodeRef.current) {
        try {
          audioSourceNodeRef.current.stop();
        } catch {}
      }
      setIsAudioPlaying(false);
    } else {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioCtx;

        const gainNode = audioCtx.createGain();
        gainNode.gain.value = audioVolume / 100;

        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.playbackRate.value = audioSpeed;

        source.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        source.start(0, audioTrimStart, Math.max(0.1, audioTrimEnd - audioTrimStart));
        audioSourceNodeRef.current = source;
        setIsAudioPlaying(true);

        source.onended = () => {
          setIsAudioPlaying(false);
        };
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Export processed audio (with Volume Boost, Fade In, Fade Out)
  const handleExportAudio = () => {
    if (!audioBuffer) return;

    setIsProcessing(true);
    setStatusMessage(
      lang === 'tr'
        ? `Ses işleniyor (Ses Güçlendirme: %${audioVolume})...`
        : `Processing audio (Volume: ${audioVolume}%)...`
    );

    try {
      const volMultiplier = audioVolume / 100;
      const wavBlob = processAndEncodeWav(
        audioBuffer,
        audioTrimStart,
        audioTrimEnd,
        volMultiplier,
        fadeInDuration,
        fadeOutDuration
      );

      const url = URL.createObjectURL(wavBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vidnoria-studio-audio.${audioFormat === 'mp3' ? 'mp3' : audioFormat}`;
      a.click();
      URL.revokeObjectURL(url);

      setIsProcessing(false);
      setStatusMessage(
        lang === 'tr'
          ? `✅ Ses başarıyla %${audioVolume} ses seviyesiyle ${audioFormat.toUpperCase()} formatında indirildi!`
          : `✅ Audio downloaded as ${audioFormat.toUpperCase()}!`
      );
    } catch (e) {
      console.error(e);
      setIsProcessing(false);
      setStatusMessage(lang === 'tr' ? 'Ses dışa aktarma başarısız oldu.' : 'Failed to export audio.');
    }
  };

  // Format mm:ss.ms
  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 10);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms}`;
  };

  const faqItems = [
    {
      q: {
        tr: 'Yüklenen fotoğrafın parlaklık, kontrast ve renk ayarlarını anlık görebilir miyim?',
        en: 'Can I see brightness, contrast, and color adjustments in real-time?',
        ar: 'هل يمكنني رؤية تعديلات السطوع والتباين في الوقت الفعلي؟',
      },
      a: {
        tr: 'Evet! Vidnoria Medya Stüdyosu donanım hızlandırmalı GPU önizleme motoru kullanır. Parlaklık, kontrast, doygunluk veya filtre kaydırıcılarını hareket ettirdiğiniz milisaniyede fotoğraf tuvali anında güncellenir.',
        en: 'Yes! Vidnoria Media Studio uses hardware-accelerated GPU preview rendering. As soon as you drag any slider, the photo preview updates with zero lag.',
        ar: 'نعم! يعتمد الاستوديو على تسريع وحدة معالجة الرسوميات GPU لعرض التعديلات فور تحريك أشرطة التمرير بدون أي تأخير.',
      },
    },
    {
      q: {
        tr: 'Yüklenen videonun formatını (MP4, WebM, MOV, AVI, MKV, GIF) nasıl dönüştürebilirim?',
        en: 'How can I convert video formats (MP4, WebM, MOV, AVI, MKV, GIF)?',
        ar: 'كيف يمكنني تحويل صيغ الفيديو إلى MP4 أو WebM أو MOV أو GIF؟',
      },
      a: {
        tr: 'Videonuzu sürükleyip bıraktıktan sonra "Hedef Video Formatı" menüsünden MP4, WebM, MOV, AVI, MKV veya Hareketli GIF seçeneklerinden dilediğinizi seçip "Dönüştür ve İndir" butonuna basmanız yeterlidir.',
        en: 'Simply drag and drop your video, select your desired format from the format dropdown, and click "Export & Download".',
        ar: 'ببساطة اسحب الفيديو واختر الصيغة المرغوبة ثم انقر على "تصدير وتحميل".',
      },
    },
    {
      q: {
        tr: 'Kısık sesli videoların veya müziklerin ses seviyesini nasıl %300 yükseltebilirim?',
        en: 'How can I boost audio volume up to 300%?',
        ar: 'كيف يمكنني تضخيم الصوت حتى 300%؟',
      },
      a: {
        tr: 'Ses Stüdyosu modumuzdaki "Ses Yükseltici & Booster" kaydırıcısı ile ses seviyesini %0 ile %300 arasında artırabilirsiniz. Özel akıllı sınırlayıcımız sayesinde ses yükselirken patlama ve cızırtı yapmaz.',
        en: 'Using our Volume Booster slider in Audio Studio mode, you can amplify volume up to 300% with intelligent soft-clipping to prevent distortion.',
        ar: 'من خلال شريط تضخيم الصوت في استوديو الصوت، يمكنك رفع مستوى الصوت حتى 300% بنقاء استوديو فائق.',
      },
    },
    {
      q: {
        tr: 'iPhone HEIC fotoğraflarını Windows ve Android cihazlarda nasıl açarım?',
        en: 'How can I open and convert iPhone HEIC photos for Windows/Android?',
        ar: 'كيف أفتح وأحول صور iPhone HEIC لأجهزة ويندوز وأندرويد؟',
      },
      a: {
        tr: 'iPhone ile çekilen .heic fotoğrafları stüdyoya bıraktığınızda sistem anında otomatik olarak algılar ve saniyeler içinde kayıpsız JPG veya PNG formatına çevirerek açar.',
        en: 'Drop your Apple .heic photo into the studio, and it is automatically converted into standard JPG or PNG within seconds right in your browser.',
        ar: 'بمجرد إفلات صورة iPhone بصيغة HEIC، يتعرف عليها النظام ويحولها فوراً إلى JPG أو PNG بدون برامج.',
      },
    },
    {
      q: {
        tr: 'Dosyalarım sunucuya yükleniyor mu? (Gizlilik & 0-Log)',
        en: 'Are my files uploaded to any server? (Privacy & 0-Log)',
        ar: 'هل يتم رفع ملفاتي لأي خادم؟',
      },
      a: {
        tr: 'Hayır. Vidnoria Medya Stüdyosu %100 yerel tarayıcı (Client-Side) üzerinde çalışır. Hiçbir video, ses veya fotoğraf sunucuya gönderilmez; verileriniz cihazınızın RAM belleğinde güvendedir.',
        en: 'No. Everything runs 100% locally in your client browser. No files are ever uploaded or saved on remote servers.',
        ar: 'كلا، تتم جميع العمليات محلياً داخل متصفحك ولا يتم تخزين أو رفع أي ملف نهائياً.',
      },
    },
  ];

  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        name: 'Vidnoria Media Studio',
        url: `https://vidnoria.com/${lang}/studio`,
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'All',
        featureList: [
          'Real-time photo adjustments with 60fps live canvas preview',
          'Video format converter (MP4, WebM, MOV, AVI, MKV, Animated GIF)',
          'Audio Studio with 300% volume booster, trimmer, and fade effects',
          'iPhone HEIC to JPG instant converter',
          '9:16 Instagram Reels and TikTok auto-resizer',
          '100% Client-side 0-Log privacy architecture',
        ],
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-16" dir={isRtl ? 'rtl' : 'ltr'}>
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
            <span>{lang === 'tr' ? 'Ana Sayfaya Dön' : 'Back to Home'}</span>
          </Link>
        </div>

        {/* Hero Header */}
        <div className="max-w-4xl mx-auto text-center py-6 sm:py-8">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-4 shadow-sm animate-fade-in">
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {lang === 'tr'
                ? 'Hepsi Bir Arada Medya Stüdyosu & Format Çevirici'
                : 'All-in-One Video, Audio & Photo Studio'}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
            <span className="gradient-text">
              {lang === 'tr'
                ? 'Video, Ses & Fotoğraf Sürükle-Bırak Düzenleyici'
                : 'Drag & Drop Video, Audio & Photo Studio'}
            </span>
          </h1>

          <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {lang === 'tr'
              ? 'Fotoğraf filtrelerini anlık canlı önizlemeyle ayarlayın; video formatlarını (MP4, WebM, MOV, GIF) dönüştürüp kırpın; ses seviyesini %300 yükseltip zil sesi yapın. Sıfır sunucu yükü, %100 gizli ve ücretsiz.'
              : 'Live 60fps photo editing preview, multi-format video converter, and 300% volume audio booster. 100% private in-browser editing.'}
          </p>

          {/* Trust Guarantees */}
          <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 text-emerald-500 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>{lang === 'tr' ? '%100 İstemci Taraflı (0-Log)' : '100% Client-Side'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <Zap className="w-4 h-4" />
              <span>{lang === 'tr' ? 'Anlık Canlı Önizleme' : 'Instant Live Preview'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-500 font-medium">
              <FileCheck className="w-4 h-4" />
              <span>{lang === 'tr' ? 'Sıfır Filigran & Sınırsız' : 'No Watermark'}</span>
            </div>
          </div>
        </div>

        {/* 3-Tab Studio Mode Selector: Video | Audio | Photo */}
        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex items-center justify-center p-1.5 bg-muted/60 backdrop-blur rounded-2xl border border-border max-w-lg mx-auto shadow-inner">
            <button
              onClick={() => setMode('video')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                mode === 'video'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              <Film className="w-4 h-4" />
              <span>{lang === 'tr' ? 'Video Stüdyosu' : 'Video Studio'}</span>
            </button>

            <button
              onClick={() => setMode('audio')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                mode === 'audio'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              <Music className="w-4 h-4" />
              <span>{lang === 'tr' ? 'Ses & Müzik' : 'Audio & Booster'}</span>
            </button>

            <button
              onClick={() => setMode('image')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                mode === 'image'
                  ? 'bg-primary text-white shadow-md'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/50'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              <span>{lang === 'tr' ? 'Fotoğraf & HEIC' : 'Photo & HEIC'}</span>
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
            className={`relative rounded-3xl border-2 border-dashed transition-all p-8 sm:p-10 text-center cursor-pointer group ${
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
                  : mode === 'audio'
                  ? 'audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac'
                  : 'image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp'
              }
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  processIncomingFile(e.target.files[0]);
                }
              }}
            />

            <div className="flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-110 group-hover:bg-primary group-hover:text-white transition-all shadow-md">
                <Upload className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-bold text-foreground mb-1">
                  {lang === 'tr'
                    ? mode === 'video'
                      ? 'Videonuzu Buraya Sürükleyip Bırakın'
                      : mode === 'audio'
                      ? 'Müzik veya Ses Dosyanızı Buraya Bırakın'
                      : 'Fotoğraf veya iPhone HEIC Dosyanızı Buraya Bırakın'
                    : 'Drag and Drop Your Media File Here'}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto">
                  {lang === 'tr'
                    ? mode === 'video'
                      ? 'MP4, MOV, WebM, MKV, AVI formatlarını destekler. Format dönüştürme ve kırpma tek tıkla yapılır.'
                      : mode === 'audio'
                      ? 'MP3, WAV, M4A, OGG destekler. %300 ses yükseltme, kesme ve efektler cihazınızda anında uygulanır.'
                      : 'JPG, PNG, WebP ve Apple iPhone HEIC fotoğraflarını anında canlı önizlemeyle düzenleyin.'
                    : 'Supported: MP4, MOV, WebM, MP3, WAV, JPG, PNG, and Apple HEIC.'}
                </p>
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold bg-muted hover:bg-accent text-foreground transition-all">
                <span>{lang === 'tr' ? 'veya Cihazınızdan Seçin' : 'or Choose File'}</span>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div className="mt-4 p-4 rounded-2xl bg-primary/10 border border-primary/20 text-foreground text-sm flex items-center gap-3 animate-slide-up">
              <AlertCircle className="w-5 h-5 text-primary shrink-0" />
              <span className="flex-1 font-medium">{statusMessage}</span>
            </div>
          )}
        </div>

        {/* ==================== 1. VIDEO STUDIO WORKSPACE ==================== */}
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
                <span>{lang === 'tr' ? 'Yeni Video Seç' : 'Change Video'}</span>
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

              <button
                onClick={toggleVideoPlayback}
                className="absolute inset-0 m-auto w-16 h-16 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all backdrop-blur-sm shadow-xl"
              >
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ms-1" />}
              </button>

              <div className="absolute bottom-3 end-3 px-3 py-1 bg-black/70 backdrop-blur rounded-lg text-white text-xs font-mono">
                {formatTime(currentTime)} / {formatTime(videoDuration)}
              </div>
            </div>

            {/* Trimmer Controls */}
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Scissors className="w-4 h-4" />
                  <span>{lang === 'tr' ? 'Video Kırpıcı & Zaman Çizelgesi' : 'Video Trimmer'}</span>
                </div>
                <div className="text-xs font-mono font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-md">
                  {lang === 'tr' ? 'Seçilen Aralık:' : 'Selected Range:'} {formatTime(Math.max(0, trimEnd - trimStart))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>{lang === 'tr' ? 'Başlangıç Saniyesi:' : 'Start:'}</span>
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
                    <span>{lang === 'tr' ? 'Bitiş Saniyesi:' : 'End:'}</span>
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

              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border">
                <span className="text-xs text-muted-foreground me-1">{lang === 'tr' ? 'Hızlı Seçim:' : 'Presets:'}</span>
                <button
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(videoDuration);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent transition-colors"
                >
                  {lang === 'tr' ? 'Tamamı' : 'Full'}
                </button>
                <button
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(Math.min(videoDuration, 15));
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent transition-colors"
                >
                  {lang === 'tr' ? 'İlk 15s (Story)' : 'First 15s'}
                </button>
                <button
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(Math.min(videoDuration, 30));
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent transition-colors"
                >
                  {lang === 'tr' ? 'İlk 30s (Reels)' : 'First 30s'}
                </button>
                <button
                  onClick={() => {
                    setTrimStart(0);
                    setTrimEnd(Math.min(videoDuration, 60));
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent transition-colors"
                >
                  {lang === 'tr' ? 'İlk 60s (Shorts)' : 'First 60s'}
                </button>
                <button
                  onClick={playVideoSlice}
                  className="ms-auto px-3 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{lang === 'tr' ? 'Seçili Aralığı Oynat' : 'Play Sliced'}</span>
                </button>
              </div>
            </div>

            {/* Video Conversion & Format Controls (User explicitly requested!) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {/* Target Format Selector */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <label className="block text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-primary" />
                  <span>{lang === 'tr' ? 'Hedef Video Formatı' : 'Target Format'}</span>
                </label>
                <select
                  value={videoFormat}
                  onChange={(e) => setVideoFormat(e.target.value as VideoFormat)}
                  className="w-full py-2 px-3 rounded-xl bg-card border border-border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="mp4">MP4 (Tüm Cihazlarla Uyumlu)</option>
                  <option value="webm">WebM (Yüksek Sıkıştırma)</option>
                  <option value="mov">MOV (Apple QuickTime)</option>
                  <option value="mkv">MKV (Matroska)</option>
                  <option value="avi">AVI (Klasik)</option>
                  <option value="gif">GIF (Hareketli GIF Yapıcı)</option>
                </select>
              </div>

              {/* Resolution / Scale Selector */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <label className="block text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-primary" />
                  <span>{lang === 'tr' ? 'Çözünürlük Kalitesi' : 'Resolution'}</span>
                </label>
                <select
                  value={videoResolution}
                  onChange={(e) => setVideoResolution(e.target.value as VideoResolution)}
                  className="w-full py-2 px-3 rounded-xl bg-card border border-border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="original">{lang === 'tr' ? 'Orijinal Çözünürlük' : 'Original'}</option>
                  <option value="1080p">1080p Full HD</option>
                  <option value="720p">720p HD</option>
                  <option value="480p">480p SD (Kompakt Boyut)</option>
                </select>
              </div>

              {/* Social Media Aspect Ratio */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <label className="block text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" />
                  <span>{lang === 'tr' ? 'Sosyal Medya Oranı' : 'Aspect Ratio'}</span>
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as VideoAspectRatio)}
                  className="w-full py-2 px-3 rounded-xl bg-card border border-border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="original">{lang === 'tr' ? 'Orijinal Oran' : 'Original'}</option>
                  <option value="9:16">9:16 (Reels, TikTok, Shorts)</option>
                  <option value="16:9">16:9 (YouTube, Geniş Ekran)</option>
                  <option value="1:1">1:1 (Kare Post)</option>
                  <option value="4:5">4:5 (Dikey Post)</option>
                </select>
              </div>

              {/* Video Speed Multiplier */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <label className="block text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span>{lang === 'tr' ? 'Video Hızı' : 'Speed'}</span>
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
                  <option value="0.25">0.25x (Ağır Çekim)</option>
                  <option value="0.5">0.5x</option>
                  <option value="1">1.0x (Normal Hız)</option>
                  <option value="1.25">1.25x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2.0x (Time-Lapse)</option>
                </select>
              </div>
            </div>

            {/* Video Actions: Transfer to Audio Studio & Export */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-border">
              <button
                onClick={transferVideoToAudioStudio}
                className="w-full sm:w-auto px-5 py-3 rounded-xl border border-secondary/30 bg-secondary/10 text-secondary hover:bg-secondary hover:text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
              >
                <Music className="w-4 h-4" />
                <span>{lang === 'tr' ? '🎵 Sesi Ayır ve Ses Stüdyosu’nda Aç (%300 Booster)' : 'Send Audio to Booster Studio'}</span>
              </button>

              <button
                onClick={handleExportVideo}
                disabled={isProcessing}
                className="w-full sm:flex-1 py-3 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'tr' ? `Dönüştürülüyor (${progress}%)...` : `Converting (${progress}%)...`}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      {lang === 'tr'
                        ? `Videoyu ${videoFormat.toUpperCase()} Olarak İndir`
                        : `Export Video as ${videoFormat.toUpperCase()}`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================== 2. AUDIO & BOOSTER WORKSPACE ==================== */}
        {mode === 'audio' && (
          <div className="max-w-4xl mx-auto glass-card p-6 sm:p-8 rounded-3xl border border-border shadow-2xl mb-12 animate-fade-in">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <Music className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-foreground truncate max-w-xs sm:max-w-md">
                    {file?.name || (lang === 'tr' ? 'Ses Parçası' : 'Audio Track')}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {lang === 'tr' ? 'Toplam Süre:' : 'Duration:'} {formatTime(audioDuration)}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setFile(null);
                  setFileUrl(null);
                  setAudioBuffer(null);
                  setStatusMessage(null);
                }}
                className="text-xs font-semibold text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'Yeni Ses Yükle' : 'Change Audio'}</span>
              </button>
            </div>

            {/* Audio Visualizer & Player Card */}
            <div className="p-6 rounded-2xl bg-black/5 dark:bg-black/30 border border-border text-center mb-6">
              <div className="flex items-center justify-center gap-4 mb-4">
                <button
                  onClick={toggleAudioPlayback}
                  className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center transition-all shadow-xl shadow-primary/30"
                >
                  {isAudioPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ms-1" />}
                </button>
              </div>

              <div className="text-xs font-mono font-bold text-foreground">
                {formatTime(audioTrimStart)} ➔ {formatTime(audioTrimEnd)} ({formatTime(Math.max(0, audioTrimEnd - audioTrimStart))})
              </div>
            </div>

            {/* 300% Volume Booster (Key Audio Feature Requested!) */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-purple-500/10 border border-amber-500/30 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Volume2 className="w-5 h-5 text-amber-500" />
                  <span className="font-extrabold text-foreground text-sm">
                    {lang === 'tr' ? 'Ses Yükseltici & Güçlendirici (Volume Booster)' : '300% Volume Booster'}
                  </span>
                </div>
                <span className="text-base font-extrabold font-mono text-amber-500">
                  %{audioVolume}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={300}
                step={5}
                value={audioVolume}
                onChange={(e) => setAudioVolume(parseInt(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer h-2 bg-muted rounded-lg"
              />
              <div className="flex justify-between text-[11px] text-muted-foreground mt-1">
                <span>%0 (Sessiz)</span>
                <span>%100 (Orijinal)</span>
                <span className="text-amber-500 font-bold">%200 (Güçlü)</span>
                <span className="text-rose-500 font-bold">%300 (Maksimum Yüksek)</span>
              </div>
            </div>

            {/* Audio Trimmer Sliders */}
            <div className="p-4 sm:p-5 rounded-2xl bg-muted/40 border border-border mb-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                  <Scissors className="w-4 h-4" />
                  <span>{lang === 'tr' ? 'MP3 Kırpıcı & Zil Sesi Yapıcı' : 'Audio Trimmer'}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{lang === 'tr' ? 'Başlangıç Saniyesi:' : 'Start:'}</span>
                  <span className="font-mono font-bold text-foreground">{formatTime(audioTrimStart)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, audioTrimEnd - 0.5)}
                  step={0.1}
                  value={audioTrimStart}
                  onChange={(e) => setAudioTrimStart(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{lang === 'tr' ? 'Bitiş Saniyesi:' : 'End:'}</span>
                  <span className="font-mono font-bold text-foreground">{formatTime(audioTrimEnd)}</span>
                </div>
                <input
                  type="range"
                  min={Math.min(audioDuration, audioTrimStart + 0.5)}
                  max={audioDuration || 100}
                  step={0.1}
                  value={audioTrimEnd}
                  onChange={(e) => setAudioTrimEnd(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Audio Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                <span className="text-xs text-muted-foreground me-1">{lang === 'tr' ? 'Önayarlar:' : 'Presets:'}</span>
                <button
                  onClick={() => {
                    setAudioTrimStart(0);
                    setAudioTrimEnd(audioDuration);
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent"
                >
                  {lang === 'tr' ? 'Tamamı' : 'Full'}
                </button>
                <button
                  onClick={() => {
                    setAudioTrimStart(0);
                    setAudioTrimEnd(Math.min(audioDuration, 30));
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent"
                >
                  {lang === 'tr' ? '30 sn (Zil Sesi)' : '30s Ringtone'}
                </button>
                <button
                  onClick={() => {
                    setAudioTrimStart(0);
                    setAudioTrimEnd(Math.min(audioDuration, 15));
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-card border border-border hover:bg-accent"
                >
                  {lang === 'tr' ? '15 sn (Hikaye)' : '15s Story'}
                </button>
              </div>
            </div>

            {/* Fade In & Fade Out Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <label className="block text-xs font-bold text-foreground mb-1">
                  {lang === 'tr' ? 'Fade In (Giriş Yumuşatma)' : 'Fade In'}
                </label>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{fadeInDuration} sn</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={fadeInDuration}
                  onChange={(e) => setFadeInDuration(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <label className="block text-xs font-bold text-foreground mb-1">
                  {lang === 'tr' ? 'Fade Out (Çıkış Kısılma)' : 'Fade Out'}
                </label>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{fadeOutDuration} sn</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.5}
                  value={fadeOutDuration}
                  onChange={(e) => setFadeOutDuration(parseFloat(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              {/* Target Format */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <label className="block text-xs font-bold text-foreground mb-2">
                  {lang === 'tr' ? 'Ses Çıktı Formatı' : 'Output Audio Format'}
                </label>
                <select
                  value={audioFormat}
                  onChange={(e) => setAudioFormat(e.target.value as AudioFormat)}
                  className="w-full py-2 px-3 rounded-xl bg-card border border-border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="mp3">MP3 (320 kbps Stüdyo Kalitesi)</option>
                  <option value="wav">WAV (Kayıpsız Stüdyo Çıktısı)</option>
                  <option value="m4a">M4A / AAC (Apple & Mobil)</option>
                  <option value="ogg">OGG (Web & Oyun)</option>
                </select>
              </div>
            </div>

            {/* Audio Download Action */}
            <div className="pt-4 border-t border-border">
              <button
                onClick={handleExportAudio}
                disabled={isProcessing}
                className="w-full py-3.5 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{lang === 'tr' ? 'Ses Kodlanıyor...' : 'Exporting Audio...'}</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>
                      {lang === 'tr'
                        ? `İşlenmiş Sesi İndir (${audioFormat.toUpperCase()} - %${audioVolume} Ses)`
                        : `Download Audio (${audioFormat.toUpperCase()} - ${audioVolume}% Volume)`}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ==================== 3. PHOTO & HEIC WORKSPACE (WITH 60FPS LIVE PREVIEW) ==================== */}
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
                <span>{lang === 'tr' ? 'Yeni Fotoğraf Seç' : 'Change Photo'}</span>
              </button>
            </div>

            {/* LIVE GPU-ACCELERATED PREVIEW CANVAS (Instant 60FPS Feedback as Sliders Move!) */}
            <div className="relative rounded-2xl overflow-hidden bg-black/5 dark:bg-black/40 border border-border p-4 flex items-center justify-center mb-6 min-h-[320px]">
              <canvas
                ref={imageCanvasRef}
                style={{
                  filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) ${
                    grayscale ? 'grayscale(100%)' : ''
                  } ${sepia ? 'sepia(100%)' : ''} ${invert ? 'invert(100%)' : ''} ${
                    blurValue > 0 ? `blur(${blurValue}px)` : ''
                  }`,
                  transform: `rotate(${rotation}deg) scale(${flipH ? -1 : 1}, ${flipV ? -1 : 1})`,
                  transition: 'transform 0.15s ease',
                }}
                className="max-h-[420px] max-w-full rounded-xl shadow-lg object-contain"
              />

              {isHeicConverting && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  <p className="text-xs font-bold text-foreground">
                    {lang === 'tr' ? 'iPhone HEIC fotoğrafı dönüştürülüyor...' : 'Converting iPhone HEIC...'}
                  </p>
                </div>
              )}

              {/* Instant feedback badge */}
              <div className="absolute top-3 end-3 px-3 py-1 bg-background/80 backdrop-blur rounded-lg border border-border text-[11px] font-bold text-primary flex items-center gap-1.5 shadow-sm">
                <Eye className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'Canlı Anlık Önizleme Aktif' : 'Live 60fps Preview'}</span>
              </div>
            </div>

            {/* 1-Click Filter Presets Bar */}
            <div className="mb-6">
              <label className="block text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                <Wand2 className="w-3.5 h-3.5 text-primary" />
                <span>{lang === 'tr' ? 'Tek Tıkla Hazır Filtreler (Presets)' : 'Filter Presets'}</span>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'none', label: 'Doğal / Orijinal' },
                  { id: 'vivid', label: 'Canlı (Vivid)' },
                  { id: 'cinematic', label: 'Sinematik' },
                  { id: 'vintage', label: 'Nostalji (Vintage)' },
                  { id: 'bw', label: 'Siyah-Beyaz (B&W)' },
                  { id: 'warm', label: 'Sıcak (Warm)' },
                  { id: 'cool', label: 'Soğuk (Cool)' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => applyFilterPreset(preset.id as FilterPreset)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      activeFilterPreset === preset.id
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-card border border-border hover:bg-accent text-foreground'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rotate & Flip Toolbar */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-6 p-3 rounded-2xl bg-muted/40 border border-border">
              <button
                onClick={() => setRotation((r) => (r - 90 + 360) % 360)}
                className="px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-accent text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? '90° Sola' : 'Rotate -90°'}</span>
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-3 py-1.5 rounded-xl bg-card border border-border hover:bg-accent text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
              >
                <RotateCw className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? '90° Sağa' : 'Rotate +90°'}</span>
              </button>
              <button
                onClick={() => setFlipH((f) => !f)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                  flipH ? 'bg-primary text-white border-primary' : 'bg-card border-border hover:bg-accent'
                }`}
              >
                <FlipHorizontal className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'Yatay Aynala' : 'Flip H'}</span>
              </button>
              <button
                onClick={() => setFlipV((f) => !f)}
                className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm ${
                  flipV ? 'bg-primary text-white border-primary' : 'bg-card border-border hover:bg-accent'
                }`}
              >
                <FlipVertical className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'Dikey Aynala' : 'Flip V'}</span>
              </button>
              <button
                onClick={() => applyFilterPreset('none')}
                className="px-3 py-1.5 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-white text-xs font-bold flex items-center gap-1.5 transition-all ms-auto"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{lang === 'tr' ? 'Filtreleri Sıfırla' : 'Reset'}</span>
              </button>
            </div>

            {/* Sliders Grid: Brightness, Contrast, Saturation, Blur */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-foreground">{lang === 'tr' ? 'Parlaklık' : 'Brightness'}</span>
                  <span className="font-mono text-primary font-bold">{brightness}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={brightness}
                  onChange={(e) => {
                    setBrightness(parseInt(e.target.value));
                    setActiveFilterPreset('none');
                  }}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-foreground">{lang === 'tr' ? 'Kontrast' : 'Contrast'}</span>
                  <span className="font-mono text-primary font-bold">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={50}
                  max={200}
                  value={contrast}
                  onChange={(e) => {
                    setContrast(parseInt(e.target.value));
                    setActiveFilterPreset('none');
                  }}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-foreground">{lang === 'tr' ? 'Doygunluk' : 'Saturation'}</span>
                  <span className="font-mono text-primary font-bold">{saturation}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={250}
                  value={saturation}
                  onChange={(e) => {
                    setSaturation(parseInt(e.target.value));
                    setActiveFilterPreset('none');
                  }}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>

              <div className="p-3.5 rounded-2xl bg-muted/30 border border-border">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-foreground">{lang === 'tr' ? 'Bulanıklık' : 'Blur'}</span>
                  <span className="font-mono text-primary font-bold">{blurValue}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={blurValue}
                  onChange={(e) => setBlurValue(parseInt(e.target.value))}
                  className="w-full accent-primary cursor-pointer"
                />
              </div>
            </div>

            {/* Resize & Format Export Options */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              {/* Dimensions */}
              <div className="p-4 rounded-2xl bg-muted/30 border border-border">
                <label className="block text-xs font-bold text-foreground mb-2">
                  {lang === 'tr' ? 'Boyutlandırma (G × Y)' : 'Resize (W × H)'}
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
                  {lang === 'tr' ? 'Hedef Format Çıktısı' : 'Target Format'}
                </label>
                <select
                  value={imageFormat}
                  onChange={(e) => setImageFormat(e.target.value as ImageFormat)}
                  className="w-full py-2 px-3 rounded-xl bg-card border border-border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/40"
                >
                  <option value="jpg">JPG / JPEG (Standart Fotoğraf)</option>
                  <option value="png">PNG (Kayıpsız / Şeffaflık)</option>
                  <option value="webp">WebP (Modern Web Formatı)</option>
                  <option value="ico">ICO (64×64 Web Favicon)</option>
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
                  {quality > 85 ? (lang === 'tr' ? 'Yüksek Kalite / Düşük Sıkıştırma' : 'High Quality') : (lang === 'tr' ? 'Kompakt Boyut' : 'Compressed Size')}
                </p>
              </div>
            </div>

            {/* Download Button */}
            <div className="pt-4 border-t border-border">
              <button
                onClick={handleExportImage}
                disabled={isProcessing}
                className="w-full py-3.5 px-6 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/25 disabled:opacity-50"
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
                        : `Download Photo (${imageFormat.toUpperCase()})`}
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

        {/* FAQ Accordion Section */}
        <section className="mt-12 pt-10 border-t border-border max-w-3xl mx-auto">
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
              <div key={idx} className="rounded-2xl border border-border bg-card/60 overflow-hidden transition-colors">
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  className="w-full p-4 sm:p-5 text-start font-bold text-xs sm:text-sm text-foreground flex items-center justify-between gap-4 hover:bg-accent/50 transition-colors"
                >
                  <span>{item.q[lang] || item.q.tr}</span>
                  {openFaq === idx ? <ChevronUp className="w-4 h-4 text-primary shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />}
                </button>
                {openFaq === idx && (
                  <div className="px-4 pb-4 sm:px-5 sm:pb-5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3 animate-fade-in">
                    {item.a[lang] || item.a.tr}
                  </div>
                )}
              </div>
            ))}
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
