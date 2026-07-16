import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const MAX_LINKS = 50; // hard limit per submit — TIDAK auto-split lagi

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }

  const { urls, campaignId, newCampaignName, batchName, appendToBatchId } = await request.json();

  if (!Array.isArray(urls) || urls.length === 0) {
    return NextResponse.json({ error: 'Tidak ada link yang dikirim.' }, { status: 400 });
  }
  if (urls.length > MAX_LINKS) {
    return NextResponse.json({ error: `Maksimal ${MAX_LINKS} link per submit.` }, { status: 400 });
  }

  const cleanUrls = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];

  // Simpan link baru ke tabel videos (skip duplikat)
  const { error: insertError } = await supabase
    .from('videos')
    .upsert(
      cleanUrls.map((url) => ({ input_url: url })),
      { onConflict: 'input_url', ignoreDuplicates: true }
    );

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // ============================================================
  // MODE A: Append ke batch yang sudah ada
  // ============================================================
  if (appendToBatchId) {
    const { data: existingBatch, error: fetchError } = await supabase
      .from('scrape_history')
      .select('status, total_count, processed_count')
      .eq('id', appendToBatchId)
      .single();

    if (fetchError || !existingBatch) {
      return NextResponse.json({ error: 'Batch tidak ditemukan.' }, { status: 404 });
    }
    if (existingBatch.status === 'running') {
      return NextResponse.json(
        { error: 'Batch ini masih berjalan, tunggu sampai selesai sebelum menambah link.' },
        { status: 409 }
      );
    }

    const { error: updateError } = await supabase
      .from('scrape_history')
      .update({
        total_count: existingBatch.total_count + cleanUrls.length,
        status: 'running',
        finished_at: null,
      })
      .eq('id', appendToBatchId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    const webhookResult = await callWebhook(appendToBatchId, cleanUrls);
    if (!webhookResult.ok) {
      await supabase
        .from('scrape_history')
        .update({ status: 'failed', finished_at: new Date().toISOString() })
        .eq('id', appendToBatchId);
      return NextResponse.json({ error: webhookResult.error }, { status: 502 });
    }

    return NextResponse.json({
      jobId: appendToBatchId,
      total: cleanUrls.length,
      mode: 'append',
    });
  }

  // ============================================================
  // MODE B/C: Buat batch baru (di campaign existing ATAU campaign baru)
  // ============================================================
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

  const { count: existingBatchCount } = await supabase
    .from('scrape_history')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', finalCampaignId);

  const finalBatchName = batchName?.trim() || `Batch ${(existingBatchCount ?? 0) + 1}`;

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

  const webhookResult = await callWebhook(historyRow.id, cleanUrls);
  if (!webhookResult.ok) {
    await supabase
      .from('scrape_history')
      .update({ status: 'failed', finished_at: new Date().toISOString() })
      .eq('id', historyRow.id);
    return NextResponse.json({ error: webhookResult.error }, { status: 502 });
  }

  return NextResponse.json({
    jobId: historyRow.id,
    campaignId: finalCampaignId,
    total: cleanUrls.length,
    batchName: finalBatchName,
    mode: 'new',
  });
}

async function callWebhook(jobId, urls) {
  try {
    const res = await fetch(process.env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify({ jobId, urls }),
    });

    if (!res.ok) {
      console.error('Webhook n8n merespons dengan status:', res.status);
      return { ok: false, error: `Webhook n8n merespons status ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    console.error('Gagal memanggil webhook n8n:', err.message);
    return { ok: false, error: 'Gagal menghubungi server scraping: ' + err.message };
  }
}
