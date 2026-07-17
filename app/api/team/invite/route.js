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

  const { data: myProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (myProfile?.role !== 'super_admin') {
    return NextResponse.json(
      { error: 'Hanya Super Admin yang bisa menambah akun.' },
      { status: 403 }
    );
  }

  const { email, password, fullName, role } = await request.json();

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Email, password, dan role wajib diisi.' }, { status: 400 });
  }
  if (!['super_admin', 'admin'].includes(role)) {
    return NextResponse.json({ error: 'Role tidak valid.' }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: 'Password minimal 6 karakter.' }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1. Buat user di Supabase Auth (langsung confirmed, tidak perlu verifikasi email)
  const { data: newUser, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createError) {
    return NextResponse.json({ error: createError.message }, { status: 500 });
  }

  // 2. Insert ke profiles — trigger di database otomatis menolak kalau slot penuh
  const { error: profileError } = await admin
    .from('profiles')
    .insert({ id: newUser.user.id, role, full_name: fullName || null });

  if (profileError) {
    // Rollback: hapus user auth yang baru dibuat kalau gagal insert profile
    await admin.auth.admin.deleteUser(newUser.user.id);
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, userId: newUser.user.id });
}
