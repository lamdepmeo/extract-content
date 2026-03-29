import { NextRequest, NextResponse } from 'next/server';
import { processJobBatch } from '@/lib/jobs';

export async function GET(req: NextRequest) {
  try {
    const userAgent = req.headers.get('user-agent') || '';
    const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
    const requestedLimit = Number(req.nextUrl.searchParams.get('limit') ?? '');

    const isVercelCron = userAgent.toLowerCase().includes('vercel-cron');
    const isManualAuthorized = !!process.env.CRON_SECRET && secret === process.env.CRON_SECRET;

    if (!isVercelCron && !isManualAuthorized) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    const result = await processJobBatch(Number.isFinite(requestedLimit) ? requestedLimit : undefined);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
