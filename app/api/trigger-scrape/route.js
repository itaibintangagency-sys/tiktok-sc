import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }

  const { urls } = await request.json();

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'Tidak ada link yang dikirim.' }, { status: 400 });
  }

  // Bersihkan: buang baris kosong, spasi, dan duplikat dalam satu submit
  const cleanUrls = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];

  const admin = createAdminClient();

  // 1. Simpan link baru ke tabel videos (skip yang sudah ada, jangan timpa data lama)
  const { error: insertError } = await admin
    .from('videos')
    .upsert(
      cleanUrls.map((url) => ({ input_url: url })),
      { onConflict: 'input_url', ignoreDuplicates: true }
    );

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 2. Buat record scrape_history untuk tracking progres
  const { data: historyRow, error: historyError } = await admin
    .from('scrape_history')
    .insert({
      triggered_by: user.id,
      trigger_type: 'manual',
      total_count: cleanUrls.length,
      processed_count: 0,
      status: 'running',
    })
    .select()
    .single();

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  // 3. Panggil webhook n8n — fire and forget, tidak menunggu scraping selesai
  fetch(process.env.N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET,
    },
    body: JSON.stringify({
      jobId: historyRow.id,
      urls: cleanUrls,
    }),
  }).catch((err) => {
    console.error('Gagal memanggil webhook n8n:', err);
  });

  return NextResponse.json({ jobId: historyRow.id, total: cleanUrls.length });
}
