import { XMLParser } from 'fast-xml-parser';
import { SitemapDiscoveredUrl } from '@/lib/types';

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: true,
  trimValues: true,
});

type SitemapUrlEntry = {
  loc?: string;
  lastmod?: string;
  image?: unknown;
};

type SitemapIndexEntry = {
  loc?: string;
};

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toSitemapUrlEntry(value: unknown): SitemapUrlEntry | null {
  if (!isRecord(value)) return null;

  const loc = typeof value.loc === 'string' ? value.loc : undefined;
  const lastmod = typeof value.lastmod === 'string' ? value.lastmod : undefined;

  return {
    loc,
    lastmod,
    image: value.image,
  };
}

function toSitemapIndexEntry(value: unknown): SitemapIndexEntry | null {
  if (!isRecord(value)) return null;

  const loc = typeof value.loc === 'string' ? value.loc : undefined;
  return { loc };
}

function classifyBySitemapUrl(sitemapUrl: string): SitemapDiscoveredUrl['type'] {
  const normalized = sitemapUrl.toLowerCase();
  if (normalized.includes('post-sitemap')) return 'POST';
  if (normalized.includes('category-sitemap')) return 'CATEGORY';
  return 'OTHER';
}

async function fetchXml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ContentAuditBot/1.0 (+https://example.local/bot)',
      Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8',
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Fetch XML failed (${response.status}) for ${url}`);
  }

  return response.text();
}

function parseXml(xml: string): Record<string, unknown> {
  const parsed: unknown = parser.parse(xml);
  if (!isRecord(parsed)) {
    throw new Error('Invalid XML document structure');
  }

  return parsed;
}

async function parseOneSitemapUrl(sitemapUrl: string): Promise<SitemapDiscoveredUrl[]> {
  const xml = await fetchXml(sitemapUrl);
  const doc = parseXml(xml);

  const urlset = isRecord(doc.urlset) ? doc.urlset : undefined;
  const urlsRaw = isRecord(urlset) ? urlset.url : undefined;
  const urls = asArray(urlsRaw)
    .map((item) => toSitemapUrlEntry(item))
    .filter((item): item is SitemapUrlEntry => item !== null);

  const type = classifyBySitemapUrl(sitemapUrl);

  return urls
    .map((entry): SitemapDiscoveredUrl | null => {
      const loc = entry.loc;
      if (!loc) return null;

      const imageNodes = asArray(entry.image);
      const imageCount = imageNodes.length;

      let lastmod: Date | null = null;
      if (entry.lastmod) {
        const date = new Date(entry.lastmod);
        if (!Number.isNaN(date.getTime())) {
          lastmod = date;
        }
      }

      return {
        url: loc,
        sitemapUrl,
        type,
        lastmod,
        imageCount,
      };
    })
    .filter((v): v is SitemapDiscoveredUrl => v !== null);
}

export async function discoverUrlsFromSitemapIndex(indexUrl: string): Promise<SitemapDiscoveredUrl[]> {
  const xml = await fetchXml(indexUrl);
  const doc = parseXml(xml);

  const sitemapIndex = isRecord(doc.sitemapindex) ? doc.sitemapindex : undefined;
  const sitemapRaw = isRecord(sitemapIndex) ? sitemapIndex.sitemap : undefined;

  const sitemapEntries = asArray(sitemapRaw)
    .map((item) => toSitemapIndexEntry(item))
    .filter((item): item is SitemapIndexEntry => item !== null);

  if (sitemapEntries.length === 0) {
    return parseOneSitemapUrl(indexUrl);
  }

  const childSitemaps = sitemapEntries
    .map((entry) => entry.loc)
    .filter((value): value is string => typeof value === 'string');

  const results = await Promise.all(childSitemaps.map((s) => parseOneSitemapUrl(s)));

  return results.flat();
}
