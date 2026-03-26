import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createJobFromSitemap } from '@/lib/jobs';

const bodySchema = z.object({
  sitemapUrl: z.string().url(),
});

export async function POST(req: NextRequest) {
  try {
    const payload = bodySchema.parse(await req.json());
    const job = await createJobFromSitemap(payload.sitemapUrl);

    return NextResponse.json({ ok: true, jobId: job.id }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
