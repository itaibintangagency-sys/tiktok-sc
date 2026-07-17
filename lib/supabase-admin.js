// lib/supabase-admin.js
//
// PENTING: file ini HANYA boleh diimport di server (API routes),
// TIDAK PERNAH di komponen client — service role key bisa bypass semua RLS.

import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY, // tambahkan env var ini di Vercel kalau belum ada
    {
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}
