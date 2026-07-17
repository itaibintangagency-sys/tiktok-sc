import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import MyBatchesGrid from '@/components/MyBatchesGrid';
import AccountBar from '@/components/AccountBar';

export default async function MyBatchesPage() {
  const supabase = createClient();

  // RLS otomatis membatasi ini ke batch milik user yang login (kalau role admin)
  const { data: batches } = await supabase
    .from('my_batches')
    .select('*')
    .order('started_at', { ascending: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  return (
    <main className="min-h-screen px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between mb-8">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">
            Creator Pulse
          </p>
          <h1 className="font-display text-2xl text-ink">Batch Saya</h1>
          <p className="text-muted text-sm mt-1 max-w-xl">
            Semua batch link yang pernah Anda submit, dikelompokkan berdasarkan campaign.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/export"
            className="text-xs font-medium text-muted hover:text-ink border border-line rounded-md px-3 py-1.5 transition-colors"
          >
            Export & AI
          </Link>
          <Link
            href="/dashboard/add-links"
            className="text-sm font-medium text-white bg-ink hover:bg-black rounded-md px-4 py-2.5 transition-colors whitespace-nowrap"
          >
            + Tambah Link
          </Link>
          <AccountBar userName={profile?.full_name} userEmail={user?.email} userRole={profile?.role} />
        </div>
      </header>

      {(!batches || batches.length === 0) && (
        <div className="border border-line rounded-lg bg-white py-16 text-center">
          <h2 className="font-display text-lg text-ink mb-2">
            Batch Anda akan muncul di sini
          </h2>
          <p className="text-muted text-sm mb-6">
            Tambahkan link video TikTok untuk mulai monitoring.
          </p>
          <Link
            href="/dashboard/add-links"
            className="inline-block text-sm font-medium text-white bg-ink hover:bg-black rounded-md px-4 py-2.5 transition-colors"
          >
            + Tambah Link
          </Link>
        </div>
      )}

      {batches && batches.length > 0 && <MyBatchesGrid batches={batches} />}
    </main>
  );
}
