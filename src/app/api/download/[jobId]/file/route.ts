import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { jobManager } from '@/lib/media/job-manager';
import { sanitizeFilename } from '@/lib/security';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  if (!jobId || !jobId.startsWith('vid_')) {
    return NextResponse.json({ error: 'Invalid Job ID' }, { status: 400, headers: corsHeaders });
  }

  const job = jobManager.getJob(jobId);
  const filePath = jobManager.getJobFilePath(jobId);

  if (!job || !filePath || !fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found or expired' }, { status: 404, headers: corsHeaders });
  }

  const stat = fs.statSync(filePath);
  const ext = (path.extname(filePath).slice(1) || job.selectedFormat.format || 'mp4').toLowerCase();
  const rawTitle = job.mediaInfo.title || 'vidnoria_video';
  const cleanTitle = sanitizeFilename(rawTitle);
  const asciiTitle = cleanTitle.replace(/[^\x20-\x7E]/g, '_') || 'vidnoria_media';
  const fullFilename = `${cleanTitle}.${ext}`;
  const asciiFilename = `${asciiTitle}.${ext}`;

  const mimeMap: Record<string, string> = {
    mp4: 'video/mp4',
    webm: 'video/webm',
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    wav: 'audio/wav',
    flac: 'audio/flac',
  };

  const contentType = mimeMap[ext] || 'application/octet-stream';
  const fileStream = fs.createReadStream(filePath);

  const readable = new ReadableStream({
    start(controller) {
      fileStream.on('data', (chunk) => controller.enqueue(chunk));
      fileStream.on('end', () => controller.close());
      fileStream.on('error', (err) => controller.error(err));
    },
    cancel() {
      fileStream.destroy();
    },
  });

  return new NextResponse(readable, {
    headers: {
      ...corsHeaders,
      'Content-Type': contentType,
      'Content-Length': stat.size.toString(),
      'Content-Disposition': `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodeURIComponent(fullFilename)}`,
      'Cache-Control': 'no-store, must-revalidate',
    },
  });
}
