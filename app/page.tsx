'use client';

import { FormEvent, useMemo, useState } from 'react';

type JobResponse = {
  ok: boolean;
  job?: {
    id: string;
    sitemapUrl: string;
    status: string;
    totalUrls: number;
    processed: number;
    failed: number;
  };
  records?: Array<{
    id: string;
    url: string;
    type: 'POST' | 'CATEGORY' | 'OTHER';
    lastmod: string | null;
    imageCount: number;
    keyword: string | null;
    topicSummary: string | null;
    fetchError: string | null;
  }>;
  cannibalizationCandidates?: Array<{ keyword: string; count: number }>;
  error?: string;
};

export default function HomePage() {
  const [sitemapUrl, setSitemapUrl] = useState('https://tenten.vn/tin-tuc/sitemap_index.xml');
  const [jobId, setJobId] = useState<string>('');
  const [result, setResult] = useState<JobResponse | null>(null);
  const [loading, setLoading] = useState(false);

  async function createJob(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sitemapUrl }),
    });

    const data = (await res.json()) as { ok: boolean; jobId?: string; error?: string };
    setLoading(false);

    if (!data.ok || !data.jobId) {
      alert(data.error || 'Cannot create job');
      return;
    }

    setJobId(data.jobId);
  }

  async function refreshJob() {
    if (!jobId) return;
    setLoading(true);
    const res = await fetch(`/api/jobs/${jobId}`);
    const data = (await res.json()) as JobResponse;
    setResult(data);
    setLoading(false);
  }

  const summary = useMemo(() => {
    if (!result?.records) return { post: 0, category: 0, other: 0 };
    return result.records.reduce(
      (acc, r) => {
        if (r.type === 'POST') acc.post += 1;
        else if (r.type === 'CATEGORY') acc.category += 1;
        else acc.other += 1;
        return acc;
      },
      { post: 0, category: 0, other: 0 },
    );
  }, [result?.records]);

  return (
    <main className="container">
      <h1>Sitemap Content Extractor</h1>
      <p>Tạo job từ WordPress sitemap, phân loại URL, trích keyword chính và phát hiện cannibalization.</p>

      <form onSubmit={createJob} className="card form">
        <label htmlFor="sitemap">Sitemap index URL</label>
        <input id="sitemap" value={sitemapUrl} onChange={(e) => setSitemapUrl(e.target.value)} required />
        <button disabled={loading} type="submit">
          {loading ? 'Đang tạo job...' : 'Tạo job'}
        </button>
      </form>

      {jobId && (
        <section className="card">
          <h2>Job ID: {jobId}</h2>
          <button onClick={refreshJob} disabled={loading}>
            {loading ? 'Đang tải...' : 'Refresh kết quả'}
          </button>
        </section>
      )}

      {result?.job && (
        <section className="card">
          <h3>Tổng quan</h3>
          <ul>
            <li>Status: {result.job.status}</li>
            <li>Total URL: {result.job.totalUrls}</li>
            <li>Processed post: {result.job.processed}</li>
            <li>Failed: {result.job.failed}</li>
            <li>Post: {summary.post} | Category: {summary.category} | Other: {summary.other}</li>
          </ul>

          <h3>Keyword trùng lặp (candidates)</h3>
          <ul>
            {(result.cannibalizationCandidates || []).slice(0, 10).map((item) => (
              <li key={item.keyword}>
                <strong>{item.keyword}</strong>: {item.count} bài
              </li>
            ))}
          </ul>
        </section>
      )}

      {result?.records && (
        <section className="card">
          <h3>Top 100 URL đầu tiên</h3>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>URL</th>
                  <th>Lastmod</th>
                  <th>Images</th>
                  <th>Keyword</th>
                </tr>
              </thead>
              <tbody>
                {result.records.slice(0, 100).map((row) => (
                  <tr key={row.id}>
                    <td>{row.type}</td>
                    <td>
                      <a href={row.url} target="_blank" rel="noreferrer">
                        {row.url}
                      </a>
                    </td>
                    <td>{row.lastmod ? new Date(row.lastmod).toLocaleString() : 'N/A'}</td>
                    <td>{row.imageCount}</td>
                    <td>{row.keyword || row.fetchError || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}
