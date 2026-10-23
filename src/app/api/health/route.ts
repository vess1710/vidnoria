import { NextResponse } from 'next/server';
import os from 'os';
import { checkFFmpeg, checkYtDlp } from '@/lib/media/processor';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function GET() {
  const [ffmpegOk, ytdlpOk] = await Promise.all([
    checkFFmpeg(),
    checkYtDlp(),
  ]);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

  return NextResponse.json(
    {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      system: {
        platform: os.platform(),
        release: os.release(),
        memory: {
          totalMB: Math.round(totalMem / (1024 * 1024)),
          freeMB: Math.round(freeMem / (1024 * 1024)),
          usedPercent: `${usedMemPercent}%`,
        },
        cpuCount: os.cpus().length,
      },
      tools: {
        ffmpeg: ffmpegOk ? 'available' : 'missing',
        ytdlp: ytdlpOk ? 'available' : 'missing',
      },
    },
    { headers: corsHeaders }
  );
}
