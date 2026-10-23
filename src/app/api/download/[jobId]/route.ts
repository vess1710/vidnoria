import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/media/job-manager';

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
    return NextResponse.json({ success: false, error: 'Invalid Job ID' }, { status: 400, headers: corsHeaders });
  }

  const job = jobManager.getJob(jobId);
  if (!job) {
    return NextResponse.json({ success: false, error: 'Job not found or expired' }, { status: 404, headers: corsHeaders });
  }

  return NextResponse.json(
    {
      success: true,
      job,
    },
    { headers: corsHeaders }
  );
}
