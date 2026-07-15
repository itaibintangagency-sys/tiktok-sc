import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// PENTING: file ini HANYA boleh dipakai di server (API routes),
// jangan pernah diimpor di client component. Service Role Key
// punya akses penuh ke database, melewati Row Level Security.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );
}
