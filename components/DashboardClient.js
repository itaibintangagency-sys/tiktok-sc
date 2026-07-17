'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import VideoTable from './VideoTable';
import TrendChart from './TrendChart';
import CommentsPanel from './CommentsPanel';
import BatchesStrip from './BatchesStrip';
import AccountBar from './AccountBar';
import CountUp from './CountUp';

export default function DashboardClient({
  initialVideos,
  userEmail,
  userName,
  userRole,
  campaignName,
  campaignId,
  isFiltered,
  batches,
}) {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [metric, setMetric] = useState('views');
  const [editingCampaign, setEditingCampaign] = useState(false);
  const [campaignNameDraft, setCampaignNameDraft] = useState(campaignName || '');
  const [savingCampaign, setSavingCampaign] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRenameCampaign() {
    if (!campaignNameDraft.trim()) return;
    setSavingCampaign(true);
    try {
      const res = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: campaignNameDraft.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Gagal mengubah nama campaign.');
        return;
      }
      setEditingCampaign(false);
      router.refresh();
    } finally {
      setSavingCampaign(false);
    }
  }

  async function handleDeleteCampaign() {
    const confirmed = window.confirm(
      `Yakin hapus campaign "${campaignName}"? Ini akan menghapus SEMUA batch dan video di dalamnya secara permanen dan tidak bisa dibatalkan.`
    );
    if (!confirmed) return;

    const res = await fetch(`/api/campaigns/${campaignId}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Gagal menghapus campaign.');
      return;
    }
    router.push('/dashboard/campaigns');
    router.refresh();
  }

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

  return (
    <main className="min-h-screen px-6 md:px-10 py-8 max-w-[1400px] mx-auto">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
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
          {isFiltered && editingCampaign ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={campaignNameDraft}
                onChange={(e) => setCampaignNameDraft(e.target.value)}
                autoFocus
                className="font-display text-2xl text-ink border-b-2 border-accent outline-none bg-transparent"
              />
              <button
                onClick={handleRenameCampaign}
                disabled={savingCampaign}
                className="text-xs font-medium text-white bg-ink rounded px-2.5 py-1 hover:bg-black disabled:opacity-50"
              >
                Simpan
              </button>
              <button
                onClick={() => {
                  setEditingCampaign(false);
                  setCampaignNameDraft(campaignName || '');
                }}
                className="text-xs text-muted hover:text-ink"
              >
                Batal
              </button>
            </div>
          ) : (
            <h1
              className={`font-display text-2xl text-ink ${
                isFiltered ? 'cursor-pointer hover:text-accent' : ''
              }`}
              onClick={() => isFiltered && campaignId && setEditingCampaign(true)}
              title={isFiltered && campaignId ? 'Klik untuk ganti nama' : undefined}
            >
              {isFiltered ? campaignName : 'Performa Video Kerjasama'}
            </h1>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {!isFiltered && (
            <Link
              href={userRole === 'super_admin' ? '/dashboard/campaigns' : '/dashboard/my-batches'}
              className="text-xs font-medium text-muted hover:text-ink border border-line rounded-md px-3 py-1.5 transition-colors"
            >
              {userRole === 'super_admin' ? 'Lihat Campaign' : 'Batch Saya'}
            </Link>
          )}
          {isFiltered && campaignId && (
            <button
              onClick={handleDeleteCampaign}
              className="text-xs font-medium text-red-500 hover:text-red-700 border border-red-200 rounded-md px-3 py-1.5 transition-colors"
            >
              Hapus Campaign
            </button>
          )}
          <Link
            href="/dashboard/export"
            className="text-xs font-medium text-muted hover:text-ink border border-line rounded-md px-3 py-1.5 transition-colors"
          >
            Export & AI
          </Link>
          <Link
            href="/dashboard/add-links"
            className="text-xs font-medium text-white bg-ink hover:bg-black rounded-md px-3 py-1.5 transition-colors"
          >
            + Tambah link
          </Link>
          <AccountBar userName={userName} userEmail={userEmail} userRole={userRole} />
        </div>
      </header>

      {batches && batches.length > 0 && (
        <BatchesStrip batches={batches} campaignId={campaignId} />
      )}

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="Total Video" value={summary.totalVideos} />
        <StatCard label="Total Views" value={summary.totalViews} />
        <StatCard label="Rata-rata ER" value={summary.avgEr} decimals={2} suffix="%" />
        <StatCard label="Jumlah Creator" value={summary.totalCreators} />
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
          exportContext={isFiltered ? campaignName : 'semua-video'}
        />
        <p className="text-xs text-muted mt-3">
          Klik baris video untuk melihat daftar komentarnya.
        </p>
      </section>

      <CommentsPanel video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </main>
  );
}

function StatCard({ label, value, decimals, suffix }) {
  return (
    <div className="border border-line rounded-lg bg-white px-4 py-3.5">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className="font-display text-2xl text-ink tabular">
        <CountUp
          value={value}
          format={decimals ? (n) => n.toFixed(decimals) : (n) => Math.round(n).toLocaleString('id-ID')}
        />
        {suffix}
      </p>
    </div>
  );
}
