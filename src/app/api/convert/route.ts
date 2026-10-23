import { NextRequest, NextResponse } from 'next/server';
import fsp from 'fs/promises';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { createRateLimiter } from '@/lib/security';
import { extractAudio, convertVideo } from '@/lib/media/processor';
import type { AudioFormat } from '@/types';

const convertLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 6 });

const MAX_UPLOAD_BYTES = 200 * 1024 * 1024; // 200MB

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

const AUDIO_FORMATS = ['mp3', 'wav', 'm4a', 'aac', 'flac'];
const VIDEO_FORMATS = ['mp4', 'webm', 'mov'];

const MIME: Record<string, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  aac: 'audio/aac',
  flac: 'audio/flac',
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

/**
 * Real server-side conversion with FFmpeg.
 * multipart/form-data: file (File), format (string), bitrate (optional string)
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '127.0.0.1';
  if (!convertLimiter.check(ip).allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please wait a moment.' },
      { status: 429, headers: corsHeaders }
    );
  }

  let inputPath = '';
  let outputPath = '';

  try {
    const form = await req.formData();
    const file = form.get('file');
    const format = String(form.get('format') || '').toLowerCase();
    const bitrate = String(form.get('bitrate') || '192');

    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'File is required.' }, { status: 400, headers: corsHeaders });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ success: false, error: 'File is too large (max 200MB).' }, { status: 413, headers: corsHeaders });
    }
    if (![...AUDIO_FORMATS, ...VIDEO_FORMATS].includes(format)) {
      return NextResponse.json({ success: false, error: 'Unsupported target format.' }, { status: 400, headers: corsHeaders });
    }

    const dir = path.join(os.tmpdir(), 'vidnoria');
    await fsp.mkdir(dir, { recursive: true });
    inputPath = path.join(dir, `${crypto.randomUUID()}.upload`);
    await fsp.writeFile(inputPath, Buffer.from(await file.arrayBuffer()));

    if (AUDIO_FORMATS.includes(format)) {
      const br = (['128', '192', '256', '320'].includes(bitrate) ? bitrate : '192') as '128' | '192' | '256' | '320';
      outputPath = await extractAudio(inputPath, format as AudioFormat, br);
    } else {
      outputPath = await convertVideo(inputPath, format as 'mp4' | 'webm' | 'mov');
    }

    const buffer = await fsp.readFile(/*turbopackIgnore: true*/ outputPath);
    return new NextResponse(buffer, {
      headers: {
        ...corsHeaders,
        'Content-Type': MIME[format] || 'application/octet-stream',
        'Content-Length': buffer.length.toString(),
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Conversion failed';
    return NextResponse.json(
      { success: false, error: message.slice(0, 200) },
      { status: 500, headers: corsHeaders }
    );
  } finally {
    if (inputPath) await fsp.unlink(/*turbopackIgnore: true*/ inputPath).catch(() => {});
    if (outputPath) await fsp.unlink(/*turbopackIgnore: true*/ outputPath).catch(() => {});
  }
}
