'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const MAX_LINKS = 50;

export default function AddLinksPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen px-6 md:px-10 py-8 max-w-2xl mx-auto">
          <p className="text-sm text-muted">Memuat...</p>
        </main>
      }
    >
      <AddLinksInner />
    </Suspense>
  );
}

function AddLinksInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const presetCampaignId = searchParams.get('campaign');
  const presetCampaignName = searchParams.get('campaignName');

  const [text, setText] = useState('');
  const [campaigns, setCampaigns] = useState([]);
  const [campaignMode, setCampaignMode] = useState(presetCampaignId ? 'existing' : 'new');
  const [selectedCampaignId, setSelectedCampaignId] = useState(presetCampaignId || '');
  const [newCampaignName, setNewCampaignName] = useState('');

  // Batch target: 'new' (buat batch baru) atau id batch existing untuk di-append
  const [batchTarget, setBatchTarget] = useState('new');
  const [batchesInCampaign, setBatchesInCampaign] = useState([]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState(null);
  const [progress, setProgress] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  const effectiveCampaignId = presetCampaignId || selectedCampaignId;

  // Daftar campaign untuk dropdown
  useEffect(() => {
    if (presetCampaignId) return;
    fetch('/api/campaigns')
      .then((res) => res.json())
      .then((data) => setCampaigns(data.campaigns || []))
      .catch(() => {});
  }, [presetCampaignId]);

  // Begitu campaign dipilih (existing), ambil daftar batch di dalamnya
  useEffect(() => {
    if (campaignMode !== 'existing' || !effectiveCampaignId) {
      setBatchesInCampaign([]);
      return;
    }
    fetch(`/api/campaigns/${effectiveCampaignId}/batches`)
      .then((res) => res.json())
      .then((data) => setBatchesInCampaign(data.batches || []))
      .catch(() => {});
  }, [campaignMode, effectiveCampaignId]);

  const linkCount = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean).length;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const urls = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    if (urls.length === 0) {
      setError('Tempel minimal 1 link TikTok.');
      return;
    }
    if (urls.length > MAX_LINKS) {
      setError(`Maksimal ${MAX_LINKS} link per submit (Anda memasukkan ${urls.length}).`);
      return;
    }
    if (campaignMode === 'existing' && !effectiveCampaignId) {
      setError('Pilih campaign terlebih dahulu.');
      return;
    }
    if (campaignMode === 'new' && !newCampaignName.trim()) {
      setError('Isi nama campaign baru.');
      return;
    }

    setSubmitting(true);

    const body = { urls };
    if (batchTarget !== 'new') {
      body.appendToBatchId = batchTarget;
    } else if (campaignMode === 'existing') {
      body.campaignId = effectiveCampaignId;
    } else {
      body.newCampaignName = newCampaignName.trim();
    }

    const res = await fetch('/api/trigger-scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || 'Gagal memulai scraping.');
      return;
    }

    setJob({ id: data.jobId, campaignId: data.campaignId || effectiveCampaignId, total: data.total });
    setText('');
  }

  useEffect(() => {
    if (!job) return;
    let interval;

    async function poll() {
      const res = await fetch(`/api/scrape-status/${job.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setProgress(data);
      if (data.status !== 'running') clearInterval(interval);
    }

    poll();
    interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [job]);

  const percent = progress ? Math.round((progress.processed_count / progress.total_count) * 100) : 0;
  const isDone = progress && progress.status !== 'running';
  const hasErrors = progress && progress.error_count > 0;

  function formatEta(seconds) {
    if (seconds === null || seconds === undefined) return null;
    if (seconds < 60) return `±${seconds} detik lagi`;
    return `±${Math.round(seconds / 60)} menit lagi`;
  }

  const nonRunningBatches = batchesInCampaign.filter((b) => b.status !== 'running');

  return (
    <main className="min-h-screen px-6 md:px-10 py-8 max-w-2xl mx-auto">
      <Link href="/dashboard/campaigns" className="text-xs text-muted hover:text-ink mb-6 inline-block">
        ← Kembali ke campaigns
      </Link>

      <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">
        Creator Pulse
      </p>
      <h1 className="font-display text-2xl text-ink mb-2">Tambah link video</h1>
      <p className="text-muted text-sm mb-8">
        Tempel link TikTok, satu link per baris. Maksimal {MAX_LINKS} link per submit.
      </p>

      {!job && (
        <form onSubmit={handleSubmit}>
          {/* Campaign selector */}
          <div className="mb-5">
            <label className="block text-xs font-medium text-muted mb-1.5">Campaign</label>

            {presetCampaignId ? (
              <div className="rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm text-ink">
                {presetCampaignName || 'Campaign ini'}
              </div>
            ) : (
              <>
                <div className="inline-flex rounded-md border border-line p-0.5 bg-white mb-2">
                  <button
                    type="button"
                    onClick={() => setCampaignMode('existing')}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      campaignMode === 'existing' ? 'bg-ink text-white' : 'text-muted'
                    }`}
                  >
                    Campaign yang sudah ada
                  </button>
                  <button
                    type="button"
                    onClick={() => setCampaignMode('new')}
                    className={`rounded px-3 py-1 text-xs font-medium transition-colors ${
                      campaignMode === 'new' ? 'bg-ink text-white' : 'text-muted'
                    }`}
                  >
                    Campaign baru
                  </button>
                </div>

                {campaignMode === 'existing' ? (
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => {
                      setSelectedCampaignId(e.target.value);
                      setBatchTarget('new');
                    }}
                    className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  >
                    <option value="">Pilih campaign...</option>
                    {campaigns.map((c) => (
                      <option key={c.campaign_id} value={c.campaign_id}>
                        {c.campaign_name} ({c.batch_count} batch)
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={newCampaignName}
                    onChange={(e) => setNewCampaignName(e.target.value)}
                    placeholder="Contoh: Kampanye Ramadan 2026"
                    className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                  />
                )}
              </>
            )}
          </div>

          {/* Batch target selector — cuma muncul kalau campaign existing sudah dipilih */}
          {campaignMode === 'existing' && effectiveCampaignId && (
            <div className="mb-5">
              <label className="block text-xs font-medium text-muted mb-1.5">
                Masukkan ke batch mana?
              </label>
              <select
                value={batchTarget}
                onChange={(e) => setBatchTarget(e.target.value)}
                className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="new">+ Buat batch baru</option>
                {nonRunningBatches.map((b) => (
                  <option key={b.batch_id} value={b.batch_id}>
                    Tambahkan ke: {b.batch_name} ({b.video_count} video saat ini)
                  </option>
                ))}
              </select>
              {batchesInCampaign.some((b) => b.status === 'running') && (
                <p className="text-[11px] text-amber-600 mt-1.5">
                  Ada batch yang sedang berjalan — tidak bisa ditambahkan link sampai selesai.
                </p>
              )}
            </div>
          )}

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={'https://vt.tiktok.com/xxxxxxx/\nhttps://www.tiktok.com/@user/video/123...\n...'}
            className="w-full rounded-md border border-line bg-white px-3.5 py-3 text-sm font-mono outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-y"
          />

          <div className="flex items-center justify-between mt-3">
            <span
              className={`text-xs tabular ${
                linkCount > MAX_LINKS ? 'text-red-600 font-medium' : 'text-muted'
              }`}
            >
              {linkCount} / {MAX_LINKS} link terdeteksi
            </span>
            <button
              type="submit"
              disabled={submitting || linkCount === 0 || linkCount > MAX_LINKS}
              className="rounded-md bg-ink text-white text-sm font-medium px-5 py-2.5 hover:bg-black transition-colors disabled:opacity-50"
            >
              {submitting ? 'Mengirim…' : `Mulai scraping (${linkCount} link)`}
            </button>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2 mt-4">
              {error}
            </p>
          )}
        </form>
      )}

      {job && (
        <div className="border border-line rounded-lg bg-white p-6">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-ink">
              {isDone ? 'Selesai' : 'Sedang memproses…'}
            </span>
            <span className="text-xs text-muted tabular">
              {progress ? `${progress.processed_count} / ${progress.total_count}` : `0 / ${job.total}`}
            </span>
          </div>

          {progress?.batch_name && (
            <p className="text-xs text-muted mb-2">Batch: {progress.batch_name}</p>
          )}

          <div className="w-full h-2 rounded-full bg-paper border border-line overflow-hidden mt-2">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>

          {!isDone && progress?.eta_seconds != null && (
            <p className="text-xs text-muted mt-2">{formatEta(progress.eta_seconds)}</p>
          )}

          {hasErrors && (
            <div className="mt-4 rounded-md border border-red-100 bg-red-50 p-3">
              <button
                type="button"
                onClick={() => setShowErrors((s) => !s)}
                className="text-xs font-medium text-red-600 hover:underline"
              >
                {progress.error_count} link gagal — {showErrors ? 'sembunyikan' : 'lihat detail'}
              </button>
              {showErrors && (
                <ul className="mt-2 space-y-1 text-xs text-red-500">
                  {progress.recent_errors.map((err, i) => (
                    <li key={i} className="truncate">
                      {err.link}: {err.error_info}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {isDone && (
            <div className="mt-5 flex items-center gap-3">
              <Link
                href={`/dashboard/campaigns/${job.campaignId}`}
                className="rounded-md bg-ink text-white text-sm font-medium px-4 py-2 hover:bg-black transition-colors"
              >
                Lihat campaign
              </Link>
              <button
                onClick={() => {
                  setJob(null);
                  setProgress(null);
                }}
                className="text-sm text-muted hover:text-ink"
              >
                Tambah batch lagi
              </button>
            </div>
          )}

          {!isDone && (
            <p className="text-xs text-muted mt-4">
              Anda bisa tutup halaman ini — proses tetap berjalan di background.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
