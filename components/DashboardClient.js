'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import VideoTable from './VideoTable';
import TrendChart from './TrendChart';
import CommentsPanel from './CommentsPanel';

export default function DashboardClient({ initialVideos, userEmail, campaignName, isFiltered }) {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [metric, setMetric] = useState('views');
  const router = useRouter();
  const supabase = createClient();

  const summary = useMemo(() => {
    const totalViews = initialVideos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalVideos = initialVideos.length;
    const avgEr =
      totalVideos === 0
        ? 0
        : initialVideos.reduce((sum, v) => sum + (Number(v.er) || 0), 0) / totalVideos;
    const totalCreators = new Set(initialVideos.map((v) => v.username).filter(Boolean)).size;

    return { totalViews, totalVideos, avgEr, totalCreators };
  }, [initialVideos]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  return (
    <main className="min-h-screen px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <header className="flex items-start justify-between mb-8">
        <div>
          {isFiltered && (
            <Link
              href="/dashboard/campaigns"
              className="text-xs text-muted hover:text-ink mb-2 inline-flex items-center gap-1"
            >
              ← Semua campaign
            </Link>
          )}
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">
            Creator Pulse
          </p>
          <h1 className="font-display text-2xl text-ink">
            {isFiltered ? campaignName : 'Performa Video Kerjasama'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          {!isFiltered && (
            <Link
              href="/dashboard/campaigns"
              className="text-xs font-medium text-muted hover:text-ink border border-line rounded-md px-3 py-1.5 transition-colors"
            >
              Lihat Campaign
            </Link>
          )}
          <Link
            href="/dashboard/add-links"
            className="text-xs font-medium text-white bg-ink hover:bg-black rounded-md px-3 py-1.5 transition-colors"
          >
            + Tambah link
          </Link>
          <span className="text-xs text-muted hidden sm:inline">{userEmail}</span>
          <button
            onClick={handleLogout}
            className="text-xs font-medium text-muted hover:text-ink border border-line rounded-md px-3 py-1.5 transition-colors"
          >
            Keluar
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Video" value={summary.totalVideos.toLocaleString('id-ID')} />
        <StatCard label="Total Views" value={summary.totalViews.toLocaleString('id-ID')} />
        <StatCard label="Rata-rata ER" value={`${summary.avgEr.toFixed(2)}%`} />
        <StatCard label="Jumlah Creator" value={summary.totalCreators.toLocaleString('id-ID')} />
      </section>

      <section className="border border-line rounded-lg bg-white p-5 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg text-ink">Tren Performa</h2>
          <div className="flex gap-1 bg-paper border border-line rounded-md p-0.5">
            <button
              onClick={() => setMetric('views')}
              className={`text-xs px-3 py-1.5 rounded transition-colors ${
                metric === 'views' ? 'bg-white shadow-sm text-ink font-medium' : 'text-muted'
              }`}
            >
              Views
            </button>
            <button
              onClick={() => setMetric('er')}
              className={`text-xs px-3 py-1.5 rounded transition-colors ${
                metric === 'er' ? 'bg-white shadow-sm text-ink font-medium' : 'text-muted'
              }`}
            >
              Engagement Rate
            </button>
          </div>
        </div>
        <TrendChart videos={initialVideos} metric={metric} />
      </section>

      <section>
        <h2 className="font-display text-lg text-ink mb-4">
          {isFiltered ? 'Video dalam Campaign Ini' : 'Semua Video'}
        </h2>
        <VideoTable
          videos={initialVideos}
          onSelectVideo={setSelectedVideo}
          selectedId={selectedVideo?.id}
        />
        <p className="text-xs text-muted mt-3">
          Klik baris video untuk melihat daftar komentarnya.
        </p>
      </section>

      <CommentsPanel video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </main>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="border border-line rounded-lg bg-white px-4 py-3.5">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="font-display text-2xl text-ink tabular">{value}</p>
    </div>
  );
}
