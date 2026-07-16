import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('scrape_history')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  // Fitur D: hitung jumlah error yang sudah terjadi untuk job ini
  const { count: errorCount } = await supabase
    .from('scrape_errors')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', params.id);

  // Fitur D: ambil beberapa pesan error terbaru (maks 5, biar payload ringan)
  const { data: recentErrors } = await supabase
    .from('scrape_errors')
    .select('link, error_info, occurred_at')
    .eq('job_id', params.id)
    .order('occurred_at', { ascending: false })
    .limit(5);

  // Fitur C: hitung ETA berdasarkan rata-rata durasi per item dari job yang
  // sudah pernah selesai (view scrape_avg_duration dari migration)
  let etaSeconds = null;
  const { data: avgData } = await supabase
    .from('scrape_avg_duration')
    .select('avg_seconds_per_item')
    .single();

  const avgSecondsPerItem = avgData?.avg_seconds_per_item ?? null;
  const remaining = data.total_count - data.processed_count;

  if (avgSecondsPerItem && remaining > 0) {
    etaSeconds = Math.round(avgSecondsPerItem * remaining);
  }

  return NextResponse.json({
    ...data, // tetap sertakan semua field asli: status, batch_name, dst
    error_count: errorCount ?? 0,
    recent_errors: recentErrors ?? [],
    eta_seconds: etaSeconds,
  });
}
