import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

// GET /api/campaigns/[id]/batches — daftar batch dalam 1 campaign
export async function GET(request, { params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('batch_summary')
    .select('*')
    .eq('campaign_id', params.id)
    .order('started_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ batches: data || [] });
}
