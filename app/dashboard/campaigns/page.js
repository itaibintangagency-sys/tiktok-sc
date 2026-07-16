import { createClient } from '@/lib/supabase-server';
import Link from 'next/link';

const STATUS_STYLE = {
  running: { label: 'Berjalan', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  success: { label: 'Selesai', className: 'bg-accentSoft text-accent border-accent/30' },
  failed: { label: 'Gagal', className: 'bg-red-50 text-red-600 border-red-200' },
  partial: { label: 'Sebagian Gagal', className: 'bg-orange-50 text-orange-600 border-orange-200' },
};

export default async function CampaignsPage() {
  const supabase = createClient();

  const { data: campaigns } = await supabase
    .from('batch_summary')
    .select('*')
    .order('started_at', { ascending: false });

  return (
    <main className="min-h-screen px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between mb-8">
        <div>
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">
            Creator Pulse
          </p>
          <h1 className="font-display text-2xl text-ink">Influencer Campaigns</h1>
          <p className="text-muted text-sm mt-1 max-w-xl">
            Pantau video organik dari creator partner Anda. Kelompokkan per campaign,
            lihat performanya, dan buka detail videonya.
          </p>
        </div>
        <Link
          href="/dashboard/add-links"
          className="text-sm font-medium text-white bg-ink hover:bg-black rounded-md px-4 py-2.5 transition-colors whitespace-nowrap"
        >
          + Campaign Baru
        </Link>
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

      {campaigns && campaigns.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map((c) => {
            const statusInfo = STATUS_STYLE[c.status] || STATUS_STYLE.running;
            return (
              <Link
                key={c.batch_id}
                href={`/dashboard?batch=${c.batch_id}`}
                className="border border-line rounded-lg bg-white p-5 hover:border-accent transition-colors group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-display text-base text-ink group-hover:text-accent transition-colors pr-2">
                    {c.batch_name}
                  </h3>
                  <span
                    className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${statusInfo.className}`}
                  >
                    {statusInfo.label}
                  </span>
                </div>

                <p className="text-xs text-muted mb-4">
                  {new Date(c.started_at).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-line">
                  <div>
                    <p className="text-[11px] text-muted mb-0.5">Video</p>
                    <p className="text-sm font-medium text-ink tabular">{c.video_count}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted mb-0.5">Views</p>
                    <p className="text-sm font-medium text-ink tabular">
                      {Number(c.total_views || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] text-muted mb-0.5">Avg ER</p>
                    <p className="text-sm font-medium text-ink tabular">
                      {Number(c.avg_er || 0).toFixed(1)}%
                    </p>
                  </div>
                </div>

                {c.status === 'running' && (
                  <p className="text-[11px] text-amber-600 mt-3">
                    {c.processed_count}/{c.total_count} link diproses...
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
