import * as cheerio from 'cheerio';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 20000 })
  : null;

export async function fetchMainText(url: string): Promise<{ text: string; statusCode: number }> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'ContentAuditBot/1.0 (+https://example.local/bot)',
      Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
    },
    cache: 'no-store',
    signal: AbortSignal.timeout(15000),
  });

  const html = await response.text();

  const $ = cheerio.load(html);
  $('script, style, noscript, iframe').remove();

  const title = $('title').first().text().trim();
  const h1 = $('h1').first().text().trim();
  const article = $('article').first().text().trim();
  const fallback = $('main, body').first().text().trim();

  const combined = [title, h1, article || fallback].filter(Boolean).join('\n\n');
  const normalized = combined.replace(/\s+/g, ' ').trim();

  return {
    text: normalized.slice(0, 12000),
    statusCode: response.status,
  };
}

export async function analyzeKeywordAndTopic(content: string): Promise<{ keyword: string; topicSummary: string }> {
  if (!content) {
    return { keyword: 'unknown', topicSummary: 'No text extracted.' };
  }

  if (!openai) {
    return {
      keyword: 'openai_key_missing',
      topicSummary: 'OPENAI_API_KEY is missing, skipped model analysis.',
    };
  }

  const prompt = `Bạn là chuyên gia SEO. Trả về JSON với key: keyword, topicSummary.\n- keyword: cụm từ khóa chính (3-8 từ)\n- topicSummary: mô tả cực ngắn (<25 từ).\nNội dung: ${content}`;

  const result = await openai.responses.create({
    model: 'gpt-5-nano',
    input: prompt,
    text: {
      format: {
        type: 'json_schema',
        name: 'keyword_topic',
        schema: {
          type: 'object',
          properties: {
            keyword: { type: 'string' },
            topicSummary: { type: 'string' },
          },
          required: ['keyword', 'topicSummary'],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = result.output_text;
  const parsed = JSON.parse(raw) as { keyword: string; topicSummary: string };

  return {
    keyword: parsed.keyword?.trim() || 'unknown',
    topicSummary: parsed.topicSummary?.trim() || 'N/A',
  };
}
