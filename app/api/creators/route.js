import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }

  // RLS otomatis batasi ke video yang boleh dilihat user (admin: punya sendiri)
  const { data, error } = await supabase.from('videos').select('username').not('username', 'is', null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const uniqueCreators = Array.from(new Set((data || []).map((v) => v.username))).sort();

  return NextResponse.json({ creators: uniqueCreators });
}
