import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// PATCH /api/campaigns/[id] — rename campaign
export async function PATCH(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }

  const { name } = await request.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Nama campaign tidak boleh kosong.' }, { status: 400 });
  }

  const { error } = await supabase
    .from('campaigns')
    .update({ name: name.trim() })
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/campaigns/[id] — hapus campaign (cascade: semua batch + video di dalamnya ikut terhapus)
export async function DELETE(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }

  const { error } = await supabase.from('campaigns').delete().eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
