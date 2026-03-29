import { JobStatus, Prisma, UrlType } from '@prisma/client';
import { ensureDatabaseSchema } from '@/lib/db-init';
import { prisma } from '@/lib/prisma';
import { discoverUrlsFromSitemapIndex } from '@/lib/sitemap';
import { analyzeKeywordAndTopic, fetchMainText } from '@/lib/content';

function getBatchSize(limit?: number) {
  if (typeof limit === 'number' && Number.isFinite(limit)) {
    return Math.min(Math.max(Math.floor(limit), 1), 10);
  }

  const envValue = Number(process.env.PROCESS_BATCH_SIZE ?? '3');
  if (Number.isFinite(envValue)) {
    return Math.min(Math.max(Math.floor(envValue), 1), 10);
  }

  return 3;
}

export async function createJobFromSitemap(sitemapUrl: string) {
  await ensureDatabaseSchema();

  const job = await prisma.job.create({
    data: {
      sitemapUrl,
      status: JobStatus.QUEUED,
    },
  });

  const discovered = await discoverUrlsFromSitemapIndex(sitemapUrl);

  if (discovered.length > 0) {
    await prisma.urlRecord.createMany({
      data: discovered.map((item) => ({
        jobId: job.id,
        url: item.url,
        sitemapUrl: item.sitemapUrl,
        type: item.type as UrlType,
        lastmod: item.lastmod,
        imageCount: item.imageCount,
      })),
      skipDuplicates: true,
    });
  }

  const totalUrls = await prisma.urlRecord.count({ where: { jobId: job.id } });
  await prisma.job.update({
    where: { id: job.id },
    data: {
      totalUrls,
      status: JobStatus.RUNNING,
    },
  });

  return job;
}

export async function processJobBatch(limit?: number) {
  await ensureDatabaseSchema();

  const batchSize = getBatchSize(limit);

  const runningJob = await prisma.job.findFirst({
    where: { status: JobStatus.RUNNING },
    orderBy: { createdAt: 'asc' },
  });

  if (!runningJob) return { processed: 0, message: 'No running job found' };

  const pending = await prisma.urlRecord.findMany({
    where: {
      jobId: runningJob.id,
      processedAt: null,
      type: UrlType.POST,
    },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  if (pending.length === 0) {
    await prisma.job.update({
      where: { id: runningJob.id },
      data: { status: JobStatus.DONE },
    });
    return { processed: 0, message: 'Job completed' };
  }

  let failed = 0;

  for (const row of pending) {
    try {
      const fetched = await fetchMainText(row.url);
      const analysis = await analyzeKeywordAndTopic(fetched.text);

      await prisma.urlRecord.update({
        where: { id: row.id },
        data: {
          extractedText: fetched.text,
          fetchStatusCode: fetched.statusCode,
          keyword: analysis.keyword,
          topicSummary: analysis.topicSummary,
          processedAt: new Date(),
        },
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'unknown error';

      await prisma.urlRecord.update({
        where: { id: row.id },
        data: {
          fetchError: message.slice(0, 500),
          processedAt: new Date(),
        },
      });
    }
  }

  const [processedCount, totalPostCount] = await Promise.all([
    prisma.urlRecord.count({ where: { jobId: runningJob.id, type: UrlType.POST, processedAt: { not: null } } }),
    prisma.urlRecord.count({ where: { jobId: runningJob.id, type: UrlType.POST } }),
  ]);

  const updateData: Prisma.JobUpdateInput = {
    processed: processedCount,
    failed: { increment: failed },
  };

  if (processedCount >= totalPostCount) {
    updateData.status = JobStatus.DONE;
  }

  await prisma.job.update({
    where: { id: runningJob.id },
    data: updateData,
  });

  return { processed: pending.length, message: `Processed ${pending.length} rows` };
}
