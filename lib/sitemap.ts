import { XMLParser } from 'fast-xml-parser';
import { SitemapDiscoveredUrl } from '@/lib/types';

const parser = new XMLParser({
  ignoreAttributes: false,
  removeNSPrefix: true,
  parseTagValue: true,
  trimValues: true,
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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

async function parseOneSitemapUrl(sitemapUrl: string): Promise<SitemapDiscoveredUrl[]> {
  const xml = await fetchXml(sitemapUrl);
  const doc = parser.parse(xml);
  const urls = asArray(doc?.urlset?.url);
  const type = classifyBySitemapUrl(sitemapUrl);

  return urls
    .map((entry: any): SitemapDiscoveredUrl | null => {
      const loc = entry?.loc;
      if (!loc || typeof loc !== 'string') return null;

      const imageNodes = asArray(entry?.image);
      const imageCount = imageNodes.length;

      let lastmod: Date | null = null;
      if (typeof entry?.lastmod === 'string') {
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
  const doc = parser.parse(xml);

  const sitemapEntries = asArray(doc?.sitemapindex?.sitemap);
  if (sitemapEntries.length === 0) {
    return parseOneSitemapUrl(indexUrl);
  }

  const childSitemaps = sitemapEntries
    .map((entry: any) => entry?.loc)
    .filter((value: unknown): value is string => typeof value === 'string');

  const results = await Promise.all(childSitemaps.map((s) => parseOneSitemapUrl(s)));

  return results.flat();
}
