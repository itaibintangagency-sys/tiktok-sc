// app/api/scrape-status/route.ts
//
// CATATAN INTEGRASI:
// - Ganti import client Supabase sesuai punya Anda (biasanya di lib/supabase.ts)
// - Sesuaikan nama tabel/kolom kalau berbeda dari asumsi di sini:
//     scrape_history: id, status, total_count, processed_count, started_at, finished_at
//     scrape_errors:  job_id, video_url, error_message, created_at
// - Endpoint ini dipanggil dashboard via polling (GET /api/scrape-status?jobId=xxx)

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'jobId wajib diisi' }, { status: 400 });
  }

  // 1. Ambil status job utama
  const { data: job, error: jobError } = await supabase
    .from('scrape_history')
    .select('id, status, total_count, processed_count, started_at, finished_at, last_item_finished_at')
    .eq('id', jobId)
    .single();

  if (jobError || !job) {
    return NextResponse.json({ error: 'Job tidak ditemukan' }, { status: 404 });
  }

  // 2. Hitung jumlah error yang sudah terjadi untuk job ini (untuk fitur D)
  const { count: errorCount } = await supabase
    .from('scrape_errors')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId);

  // 3. Ambil daftar pesan error terbaru (maks 5, biar payload ringan)
  const { data: recentErrors } = await supabase
    .from('scrape_errors')
    .select('video_url, error_message, created_at')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
    .limit(5);

  // 4. Hitung ETA (untuk fitur C) — pakai rata-rata historis dari view
  let etaSeconds: number | null = null;
  const { data: avgData } = await supabase
    .from('scrape_avg_duration')
    .select('avg_seconds_per_item')
    .single();

  const avgSecondsPerItem = avgData?.avg_seconds_per_item ?? null;
  const remaining = job.total_count - job.processed_count;

  if (avgSecondsPerItem && remaining > 0) {
    etaSeconds = Math.round(avgSecondsPerItem * remaining);
  }

  return NextResponse.json({
    status: job.status, // "running" | "completed" | "failed"
    processed_count: job.processed_count,
    total_count: job.total_count,
    error_count: errorCount ?? 0,
    recent_errors: recentErrors ?? [],
    eta_seconds: etaSeconds, // null kalau belum ada data historis
    started_at: job.started_at,
  });
}
