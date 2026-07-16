import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// PATCH /api/batches/[id] — update nama, tanggal, atau notes batch
export async function PATCH(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }

  const { batch_name, batch_date, notes } = await request.json();

  const updateData = {};
  if (batch_name !== undefined) updateData.batch_name = batch_name;
  if (batch_date !== undefined) updateData.batch_date = batch_date || null;
  if (notes !== undefined) updateData.notes = notes;

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Tidak ada perubahan yang dikirim.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('scrape_history')
    .update(updateData)
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/batches/[id] — hapus batch (cascade: video di batch itu ikut terhapus)
export async function DELETE(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }

  // Cegah hapus batch yang masih running — data bisa korup di tengah proses n8n
  const { data: batch } = await supabase
    .from('scrape_history')
    .select('status')
    .eq('id', params.id)
    .single();

  if (batch?.status === 'running') {
    return NextResponse.json(
      { error: 'Batch ini masih berjalan, tidak bisa dihapus sekarang.' },
      { status: 409 }
    );
  }

  const { error } = await supabase.from('scrape_history').delete().eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
