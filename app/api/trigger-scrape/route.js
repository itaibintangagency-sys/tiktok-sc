import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const MAX_LINKS = 50; // batas per BATCH (1 submit), bukan per campaign

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }

  const { urls, campaignId, newCampaignName, batchName } = await request.json();

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'Tidak ada link yang dikirim.' }, { status: 400 });
  }

  if (urls.length > MAX_LINKS) {
    return NextResponse.json(
      { error: `Maksimal ${MAX_LINKS} link per batch.` },
      { status: 400 }
    );
  }

  const cleanUrls = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];

  // 1. Tentukan campaign: pakai yang sudah ada, atau buat baru
  let finalCampaignId = campaignId || null;

  if (!finalCampaignId) {
    if (!newCampaignName?.trim()) {
      return NextResponse.json(
        { error: 'Pilih campaign yang sudah ada, atau isi nama campaign baru.' },
        { status: 400 }
      );
    }

    const { data: newCampaign, error: campaignError } = await supabase
      .from('campaigns')
      .insert({ name: newCampaignName.trim(), created_by: user.id })
      .select('id')
      .single();

    if (campaignError || !newCampaign) {
      return NextResponse.json(
        { error: 'Gagal membuat campaign baru: ' + campaignError?.message },
        { status: 500 }
      );
    }

    finalCampaignId = newCampaign.id;
  }

  // 2. Simpan link baru ke tabel videos (skip yang sudah ada)
  const { error: insertError } = await supabase
    .from('videos')
    .upsert(
      cleanUrls.map((url) => ({ input_url: url })),
      { onConflict: 'input_url', ignoreDuplicates: true }
    );

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Hitung urutan batch ke berapa dalam campaign ini, untuk nama default
  const { count: existingBatchCount } = await supabase
    .from('scrape_history')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', finalCampaignId);

  const finalBatchName = batchName?.trim() || `Batch ${(existingBatchCount ?? 0) + 1}`;

  // 3. Buat record scrape_history (= 1 batch) di dalam campaign ini
  const { data: historyRow, error: historyError } = await supabase
    .from('scrape_history')
    .insert({
      triggered_by: user.id,
      trigger_type: 'manual',
      total_count: cleanUrls.length,
      processed_count: 0,
      status: 'running',
      campaign_id: finalCampaignId,
      batch_name: finalBatchName,
    })
    .select()
    .single();

  if (historyError) {
    return NextResponse.json({ error: historyError.message }, { status: 500 });
  }

  // 4. Panggil webhook n8n
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
    await supabase
      .from('scrape_history')
      .update({ status: 'failed', finished_at: new Date().toISOString() })
      .eq('id', historyRow.id);

    return NextResponse.json(
      { error: 'Gagal menghubungi server scraping: ' + err.message },
      { status: 502 }
    );
  }

  return NextResponse.json({
    jobId: historyRow.id,
    campaignId: finalCampaignId,
    total: cleanUrls.length,
    batchName: finalBatchName,
  });
}
