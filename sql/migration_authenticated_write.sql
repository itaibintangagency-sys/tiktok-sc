-- Jalankan di Supabase SQL Editor
-- Tujuan: izinkan user yang SUDAH LOGIN (authenticated) untuk menambah link baru
-- dan membuat record tracking progres, tanpa perlu Service Role Key di web app.

create policy "Authenticated users can insert videos"
  on videos for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update videos"
  on videos for update
  to authenticated
  using (true);

create policy "Authenticated users can insert scrape history"
  on scrape_history for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update scrape history"
  on scrape_history for update
  to authenticated
  using (true);
