export type SitemapDiscoveredUrl = {
  url: string;
  sitemapUrl: string;
  type: 'POST' | 'CATEGORY' | 'OTHER';
  lastmod: Date | null;
  imageCount: number;
};
