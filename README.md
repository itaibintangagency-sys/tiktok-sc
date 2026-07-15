# Creator Pulse — TikTok Analytics Dashboard

Dashboard internal untuk memantau performa video TikTok dari rekan creator kerjasama. Data disimpan di Supabase (PostgreSQL), diisi oleh workflow n8n yang sudah berjalan, dan ditampilkan di sini.

## Fitur

- Login tim internal (Supabase Auth)
- Tabel video dengan search, filter (creator/bulan), dan sort per kolom
- Grafik tren Views & Engagement Rate per waktu
- Panel komentar per video (diurutkan dari likes terbanyak)

## 1. Setup Database di Supabase

1. Buka project Supabase Anda → **SQL Editor**
2. Jalankan seluruh isi file `sql/schema.sql` di sini
3. Buka **Authentication → Users → Add User** untuk membuat akun tiap anggota tim (email + password)

## 2. Ubah Workflow n8n: Google Sheets → Supabase

Supabase adalah PostgreSQL biasa, jadi n8n bisa konek langsung pakai **Postgres node** (bukan node Supabase khusus, supaya lebih fleksibel untuk query upsert).

**Kredensial Postgres di n8n** (ambil dari Supabase → Project Settings → Database):
- Host: `db.xxxxxxxx.supabase.co`
- Database: `postgres`
- User: `postgres`
- Password: (password database Anda)
- Port: `5432` (atau pakai **Connection Pooling** port `6543` untuk koneksi lebih stabil dari n8n)

Ganti node di workflow:

| Node Lama | Node Baru (Postgres) | Query |
|---|---|---|
| Google Sheets - Read Links | Postgres → Execute Query | `SELECT input_url FROM videos;` |
| Google Sheets - Update Metrics | Postgres → Execute Query | `INSERT INTO videos (input_url, linkupdated, video_id, username, post_date, post_date_display, month, caption, views, likes, comments_count, saves, shares, er) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (input_url) DO UPDATE SET linkupdated=EXCLUDED.linkupdated, views=EXCLUDED.views, likes=EXCLUDED.likes, comments_count=EXCLUDED.comments_count, saves=EXCLUDED.saves, shares=EXCLUDED.shares, er=EXCLUDED.er, updated_at=NOW();` |
| Google Sheets - Append Comments | Postgres → Execute Query | `INSERT INTO video_comments (video_link, username_video, commenter_username, comment_id, comment_text, likes, reply_count, comment_time) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT (comment_id) DO NOTHING;` |
| Google Sheets - Log Error | Postgres → Execute Query | `INSERT INTO scrape_errors (link, error_info) VALUES ($1,$2);` |

Di n8n, parameter `$1, $2, ...` diisi lewat tab **Query Parameters** pada node Postgres, urutannya mengikuti field dari `Edit Fields` sebelumnya.

## 3. Jalankan di Lokal (Opsional, untuk Testing)

```bash
npm install
cp .env.local.example .env.local
# isi NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY dari Supabase Dashboard > Settings > API
npm run dev
```

Buka `http://localhost:3000` — akan redirect ke `/login`.

## 4. Deploy ke Vercel

1. Push folder ini ke repository GitHub
2. Buka [vercel.com](https://vercel.com) → **Add New Project** → import repo tersebut
3. Di step **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (ambil dari Supabase Dashboard → Project Settings → API)
4. Klik **Deploy**

Setelah selesai, Vercel akan beri URL publik (mis. `creator-pulse.vercel.app`) — inilah yang dibagikan ke tim internal.

## Struktur Folder

```
app/
  login/page.js        → halaman login
  dashboard/page.js     → server component, fetch data awal
  layout.js, page.js    → root layout & redirect
components/
  DashboardClient.js     → state utama dashboard (stat cards, chart, tabel)
  VideoTable.js          → tabel dengan search/filter/sort
  TrendChart.js          → grafik Views/ER
  CommentsPanel.js        → panel slide-in daftar komentar
lib/
  supabase-browser.js    → client Supabase untuk sisi browser
  supabase-server.js     → client Supabase untuk server component
middleware.js            → proteksi route /dashboard, redirect kalau belum login
sql/schema.sql           → skema database + Row Level Security
```

## Catatan Keamanan

- Tabel `videos` dan `video_comments` diproteksi **Row Level Security**: hanya user yang sudah login (`authenticated`) yang bisa membaca data.
- n8n menulis ke database memakai koneksi Postgres langsung (bukan API key Supabase), jadi tidak terpengaruh RLS — pastikan password database Supabase disimpan aman di credential n8n, jangan hardcode di URL/body node.
