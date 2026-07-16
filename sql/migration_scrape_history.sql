-- Jalankan ini kalau tabel scrape_history belum ada (cek dulu di Table Editor Supabase)

create table if not exists scrape_history (
    id uuid primary key default gen_random_uuid(),
    triggered_by uuid,
    trigger_type text default 'manual',
    total_count int default 0,
    processed_count int default 0,
    started_at timestamptz default now(),
    finished_at timestamptz,
    status text default 'running'
);

alter table scrape_history enable row level security;

create policy "Authenticated users can read scrape history"
  on scrape_history for select
  to authenticated
  using (true);
