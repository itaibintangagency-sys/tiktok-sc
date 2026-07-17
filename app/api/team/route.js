import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

const SLOT_LIMITS = { super_admin: 4, admin: 5 };

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Belum login.' }, { status: 401 });
  }

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (myProfile?.role !== 'super_admin') {
    return NextResponse.json({ error: 'Akses ditolak.' }, { status: 403 });
  }

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, created_at')
    .order('created_at', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const superAdminCount = profiles.filter((p) => p.role === 'super_admin').length;
  const adminCount = profiles.filter((p) => p.role === 'admin').length;

  return NextResponse.json({
    profiles,
    slots: {
      super_admin: { used: superAdminCount, max: SLOT_LIMITS.super_admin },
      admin: { used: adminCount, max: SLOT_LIMITS.admin },
    },
  });
}
