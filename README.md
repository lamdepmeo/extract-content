# Sitemap Content Extractor (Next.js + Vercel)

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
- `CRON_SECRET`: secret bảo vệ endpoint cron.

## 3) Luồng chạy

1. Gọi `POST /api/jobs` với `sitemapUrl` để tạo job.
2. Hệ thống parse sitemap index + sitemap con, lưu URL vào DB.
3. Vercel Cron gọi `GET /api/cron/process` mỗi phút (header `x-cron-secret`) để xử lý batch 20 URL POST/lần.
4. Gọi `GET /api/jobs/:id` để theo dõi tiến trình và xem candidate cannibalization.

## 4) Deploy lên Vercel

1. Push repo lên GitHub.
2. Import vào Vercel.
3. Thêm env vars (`DATABASE_URL`, `OPENAI_API_KEY`, `CRON_SECRET`).
4. Chạy migrate/push schema bằng local CI step trước khi bật production traffic.

## 5) MVP roadmap

- V1 (hiện tại): keyword-based cannibalization.
- V2: bổ sung embedding similarity để nhóm chính xác hơn.
- V3: export CSV + đề xuất merge/canonical/redirect.
