import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

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

  // 1. Simpan link baru ke tabel videos (skip yang sudah ada, jangan timpa data lama)
  const { error: insertError } = await supabase
    .from('videos')
    .upsert(
      cleanUrls.map((url) => ({ input_url: url })),
      { onConflict: 'input_url', ignoreDuplicates: true }
    );

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 2. Buat record scrape_history untuk tracking progres
  const { data: historyRow, error: historyError } = await supabase
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

  // 3. Panggil webhook n8n — DIWAJIBKAN await di lingkungan serverless,
  // karena fire-and-forget bisa terpotong begitu function mengirim response.
  try {
    const webhookRes = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        jobId: historyRow.id,
        urls: cleanUrls,
      }),
    });

    if (!webhookRes.ok) {
      console.error('Webhook n8n merespons dengan status:', webhookRes.status);
    }
  } catch (err) {
    console.error('Gagal memanggil webhook n8n:', err.message);
    // Job tetap dibuat di DB, tapi tandai gagal supaya tidak macet selamanya di "running"
    await supabase
      .from('scrape_history')
      .update({ status: 'failed', finished_at: new Date().toISOString() })
      .eq('id', historyRow.id);

    return NextResponse.json(
      { error: 'Gagal menghubungi server scraping: ' + err.message },
      { status: 502 }
    );
  }

  return NextResponse.json({ jobId: historyRow.id, total: cleanUrls.length });
}
