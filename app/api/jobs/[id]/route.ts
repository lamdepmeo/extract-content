import { NextRequest, NextResponse } from 'next/server';
import { ensureDatabaseSchema } from '@/lib/db-init';
import { prisma } from '@/lib/prisma';

export async function GET(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  await ensureDatabaseSchema();

  const { id } = await context.params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      urlRecords: {
        orderBy: { createdAt: 'asc' },
        take: 200,
      },
    },
  });

  if (!job) {
    return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });
  }

  const keywordMap = new Map<string, number>();
  for (const record of job.urlRecords) {
    if (!record.keyword) continue;
    keywordMap.set(record.keyword, (keywordMap.get(record.keyword) || 0) + 1);
  }

  const cannibalizationCandidates = [...keywordMap.entries()]
    .filter(([, count]) => count > 1)
    .sort((a, b) => b[1] - a[1])
    .map(([keyword, count]) => ({ keyword, count }));

  return NextResponse.json({
    ok: true,
    job: {
      id: job.id,
      sitemapUrl: job.sitemapUrl,
      status: job.status,
      totalUrls: job.totalUrls,
      processed: job.processed,
      failed: job.failed,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    },
    cannibalizationCandidates,
    records: job.urlRecords,
  });
}
