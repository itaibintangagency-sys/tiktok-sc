// app/api/trigger-scrape/route.ts
//
// CATATAN INTEGRASI:
// - Ini kerangka; gabungkan dengan validasi/logic yang sudah ada di route
//   Anda sekarang. Bagian PENTING yang perlu ditambahkan ke kode Anda:
//     1. Terima `batchName` dari body request
//     2. Simpan `batch_name` saat insert row baru ke scrape_history
//     3. Kirim `jobId` (= id row scrape_history) ke n8n sebagai `batchId`
//        juga — supaya n8n bisa menuliskannya ke kolom videos.batch_id

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function defaultBatchName() {
  const now = new Date();
  return `Batch ${now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })} ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { links, batchName } = body as { links: string[]; batchName?: string | null };

  if (!links || links.length === 0) {
    return NextResponse.json({ error: 'links wajib diisi' }, { status: 400 });
  }

  // 1. Buat row job baru di scrape_history, sekaligus jadi batch_id
  const { data: job, error: insertError } = await supabase
    .from('scrape_history')
    .insert({
      status: 'running',
      total_count: links.length,
      processed_count: 0,
      started_at: new Date().toISOString(),
      batch_name: batchName || defaultBatchName(),
    })
    .select('id')
    .single();

  if (insertError || !job) {
    return NextResponse.json({ error: 'Gagal membuat job' }, { status: 500 });
  }

  const jobId = job.id;

  // 2. Trigger n8n — jobId dipakai juga sebagai batchId
  try {
    const n8nRes = await fetch(process.env.N8N_WEBHOOK_URL!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': process.env.N8N_WEBHOOK_SECRET!,
      },
      body: JSON.stringify({
        jobId,
        batchId: jobId, // sengaja sama — 1 job = 1 batch
        links,
      }),
    });

    if (!n8nRes.ok) {
      console.error('Webhook n8n merespons dengan status:', n8nRes.status);
      // Job tetap dianggap dimulai di sisi kita; n8n yang gagal direspons
      // akan terlihat dari processed_count yang tidak bergerak di dashboard
    }
  } catch (err) {
    console.error('Gagal menghubungi n8n:', err);
  }

  return NextResponse.json({ jobId });
}
