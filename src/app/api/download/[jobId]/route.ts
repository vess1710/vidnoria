import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/media/job-manager';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  if (!jobId || !jobId.startsWith('vid_')) {
    return NextResponse.json({ success: false, error: 'Invalid Job ID' }, { status: 400 });
  }

  const job = jobManager.getJob(jobId);
  if (!job) {
    return NextResponse.json({ success: false, error: 'Job not found or expired' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    job,
  });
}
