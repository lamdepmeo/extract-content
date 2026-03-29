# Sitemap Content Extractor (Next.js + Netlify)

Ứng dụng web để:
- Nhập WordPress sitemap index.
- Parse toàn bộ sitemap con và trích xuất URL.
- Phân loại URL theo loại sitemap (POST / CATEGORY / OTHER).
- Lấy `lastmod`, số lượng ảnh từ sitemap.
- Fetch nội dung bài viết (POST) và dùng `gpt-5-nano` để xác định keyword chính.
- Gợi ý cannibalization theo keyword trùng.

## 1) Chạy local

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:push
npm run dev
```

Mở `http://localhost:3000`.

## 2) Cấu hình môi trường

- `DATABASE_URL`: Postgres (khuyên dùng Supabase/Neon).
- `OPENAI_API_KEY`: khóa API OpenAI.
- `CRON_SECRET`: secret cho endpoint cron thủ công `/api/cron/process`.

## 3) Luồng chạy

1. Gọi `POST /api/jobs` với `sitemapUrl` để tạo job.
2. Hệ thống parse sitemap index + sitemap con, lưu URL vào DB.
3. Netlify Scheduled Function `cron-process` chạy mỗi 15 phút để xử lý batch 20 URL POST/lần.
4. Gọi `GET /api/jobs/:id` để theo dõi tiến trình và xem candidate cannibalization.

## 4) Deploy lên Netlify

1. Push repo lên GitHub.
2. Import project vào Netlify.
3. Build command: `npm run build:netlify`.
4. Thêm env vars (`DATABASE_URL`, `OPENAI_API_KEY`, `CRON_SECRET`).
5. Trigger deploy.
6. Netlify build sáº½ tá»± cháº¡y `prisma db push` Ä‘á»ƒ táº¡o/cáº­p nháº­t schema trÃªn database production trÆ°á»›c khi app cháº¡y.

Netlify schedule được cấu hình trong `netlify.toml` và function `netlify/functions/cron-process.ts`.

## 5) Trigger batch thủ công (tuỳ chọn)

Trong trường hợp muốn chạy ngay (không đợi lịch), có thể gọi:

```bash
curl "https://<your-domain>/api/cron/process?secret=<CRON_SECRET>"
```

## 6) MVP roadmap

- V1 (hiện tại): keyword-based cannibalization.
- V2: bổ sung embedding similarity để nhóm chính xác hơn.
- V3: export CSV + đề xuất merge/canonical/redirect.
