import { NextRequest, NextResponse } from 'next/server';
import { processJobBatch } from '@/lib/jobs';

export async function GET(req: NextRequest) {
  const userAgent = req.headers.get('user-agent') || '';
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');

  const isVercelCron = userAgent.toLowerCase().includes('vercel-cron');
  const isManualAuthorized = !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;

  if (!isVercelCron && !isManualAuthorized) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processJobBatch(20);
  return NextResponse.json({ ok: true, ...result });
}
