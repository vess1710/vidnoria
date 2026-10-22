import { NextResponse } from 'next/server';
import os from 'os';
import { isAdminAuthenticated } from '@/lib/admin/auth';
import { checkFFmpeg, checkYtDlp } from '@/lib/media/processor';

export async function GET() {
  const isAuth = await isAdminAuthenticated();
  if (!isAuth) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const [ffmpegOk, ytdlpOk] = await Promise.all([
    checkFFmpeg(),
    checkYtDlp(),
  ]);

  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMemPercent = Math.round(((totalMem - freeMem) / totalMem) * 100);

  return NextResponse.json({
    success: true,
    stats: {
      uptimeSeconds: process.uptime(),
      platform: os.platform(),
      cpus: os.cpus().length,
      memory: {
        totalMB: Math.round(totalMem / (1024 * 1024)),
        freeMB: Math.round(freeMem / (1024 * 1024)),
        usedPercent: usedMemPercent,
      },
      tools: {
        ffmpeg: ffmpegOk,
        ytdlp: ytdlpOk,
      },
      // Note for GA4: As specified, if GA4 credentials are not yet configured, explicitly indicate configuration needed.
      analytics: {
        status: process.env.GA4_MEASUREMENT_ID ? 'active' : 'not_configured',
        message: process.env.GA4_MEASUREMENT_ID ? 'Connected to GA4' : 'Google Analytics 4 configuration required for live visitor tracking.',
      },
    },
  });
}
