-- Jalankan di Supabase SQL Editor

create table if not exists videos (
    id bigint generated always as identity primary key,
    input_url text unique not null,
    linkupdated text,
    video_id text,
    username text,
    post_date timestamptz,
    post_date_display text,
    month int,
    caption text,
    views int default 0,
    likes int default 0,
    comments_count int default 0,
    saves int default 0,
    shares int default 0,
    er numeric(6,2) default 0,
    updated_at timestamptz default now()
);

create table if not exists video_comments (
    id bigint generated always as identity primary key,
    video_link text references videos(input_url) on delete cascade,
    username_video text,
    commenter_username text,
    comment_id text unique,
    comment_text text,
    likes int default 0,
    reply_count int default 0,
    comment_time timestamptz,
    scraped_at timestamptz default now()
);

create table if not exists scrape_errors (
    id bigint generated always as identity primary key,
    link text,
    error_info text,
    occurred_at timestamptz default now()
);

-- Index untuk mempercepat query dashboard
create index if not exists idx_videos_post_date on videos(post_date);
create index if not exists idx_videos_username on videos(username);
create index if not exists idx_comments_video_link on video_comments(video_link);

-- Row Level Security: hanya user yang sudah login (via Supabase Auth) yang boleh baca
alter table videos enable row level security;
alter table video_comments enable row level security;
alter table scrape_errors enable row level security;

create policy "Authenticated users can read videos"
  on videos for select
  to authenticated
  using (true);

create policy "Authenticated users can read comments"
  on video_comments for select
  to authenticated
  using (true);

create policy "Authenticated users can read errors"
  on scrape_errors for select
  to authenticated
  using (true);

-- Catatan: n8n menulis ke tabel ini memakai Service Role Key (bypass RLS),
-- jadi tidak perlu policy INSERT/UPDATE untuk role authenticated di sini.

-- Setup user tim internal:
-- Buka Supabase Dashboard > Authentication > Users > Add User
-- untuk menambahkan akun email/password tiap anggota tim.
