import { prisma } from '@/lib/prisma';

let schemaInitPromise: Promise<void> | null = null;

async function runSchemaInit() {
  const statements = [
    `DO $$ BEGIN
      CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'DONE', 'FAILED');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;`,
    `DO $$ BEGIN
      CREATE TYPE "UrlType" AS ENUM ('POST', 'CATEGORY', 'OTHER');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;`,
    `CREATE TABLE IF NOT EXISTS "Job" (
      "id" TEXT NOT NULL,
      "sitemapUrl" TEXT NOT NULL,
      "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
      "totalUrls" INTEGER NOT NULL DEFAULT 0,
      "processed" INTEGER NOT NULL DEFAULT 0,
      "failed" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE TABLE IF NOT EXISTS "UrlRecord" (
      "id" TEXT NOT NULL,
      "jobId" TEXT NOT NULL,
      "url" TEXT NOT NULL,
      "sitemapUrl" TEXT NOT NULL,
      "type" "UrlType" NOT NULL DEFAULT 'OTHER',
      "lastmod" TIMESTAMP(3),
      "imageCount" INTEGER NOT NULL DEFAULT 0,
      "fetchStatusCode" INTEGER,
      "fetchError" TEXT,
      "extractedText" TEXT,
      "keyword" TEXT,
      "topicSummary" TEXT,
      "processedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UrlRecord_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "UrlRecord_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "UrlRecord_jobId_url_key" ON "UrlRecord"("jobId", "url");`,
    `CREATE INDEX IF NOT EXISTS "UrlRecord_jobId_type_idx" ON "UrlRecord"("jobId", "type");`,
  ];

  for (const statement of statements) {
    await prisma.$executeRawUnsafe(statement);
  }
}

export async function ensureDatabaseSchema() {
  if (!schemaInitPromise) {
    schemaInitPromise = runSchemaInit().catch((error) => {
      schemaInitPromise = null;
      throw error;
    });
  }

  await schemaInitPromise;
}
