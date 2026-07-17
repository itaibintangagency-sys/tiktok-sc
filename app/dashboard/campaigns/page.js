import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';
import CampaignsListGrid from '@/components/CampaignsListGrid';
import AccountBar from '@/components/AccountBar';

export default async function CampaignsPage() {
  const supabase = createClient();

  const { data: campaigns } = await supabase
    .from('campaign_summary')
    .select('*')
    .order('last_batch_at', { ascending: false, nullsFirst: false });

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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">
            Creator Pulse
          </p>
          <h1 className="font-display text-2xl text-ink">Influencer Campaigns</h1>
          <p className="text-muted text-sm mt-1 max-w-xl">
            1 campaign bisa berisi banyak batch link. Klik campaign untuk lihat semua
            batch dan videonya.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Link
            href="/dashboard/team"
            className="text-xs font-medium text-muted hover:text-ink border border-line rounded-md px-3 py-1.5 transition-colors"
          >
            Kelola Tim
          </Link>
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
            + Campaign Baru
          </Link>
          <AccountBar userName={profile?.full_name} userEmail={user?.email} userRole={profile?.role} />
        </div>
      </header>

      {(!campaigns || campaigns.length === 0) && (
        <div className="border border-line rounded-lg bg-white py-16 text-center">
          <h2 className="font-display text-lg text-ink mb-2">
            Campaign Anda akan muncul di sini
          </h2>
          <p className="text-muted text-sm mb-6">
            Tambahkan link video dari creator partner untuk mulai monitoring.
          </p>
          <Link
            href="/dashboard/add-links"
            className="inline-block text-sm font-medium text-white bg-ink hover:bg-black rounded-md px-4 py-2.5 transition-colors"
          >
            + Campaign Baru
          </Link>
        </div>
      )}

      {campaigns && campaigns.length > 0 && <CampaignsListGrid campaigns={campaigns} />}
    </main>
  );
}
