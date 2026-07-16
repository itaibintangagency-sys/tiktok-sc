'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function AddLinksPage() {
  const [text, setText] = useState('');
  const [batchName, setBatchName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState(null); // { id, total }
  const [progress, setProgress] = useState(null); // row dari scrape_history + error_count, eta_seconds
  const [showErrors, setShowErrors] = useState(false);
  const pollRef = useRef(null);

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

    setSubmitting(true);
    const res = await fetch('/api/trigger-scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ urls, batchName: batchName.trim() || null }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(data.error || 'Gagal memulai scraping.');
      return;
    }

    setJob({ id: data.jobId, total: data.total });
    setText('');
  }

  useEffect(() => {
    if (!job) return;

    async function poll() {
      const res = await fetch(`/api/scrape-status/${job.id}`);
      if (!res.ok) return;
      const data = await res.json();
      setProgress(data);

      if (data.status === 'success' || data.status === 'failed' || data.status === 'partial') {
        clearInterval(pollRef.current);
      }
    }

    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => clearInterval(pollRef.current);
  }, [job]);

  const percent = progress ? Math.round((progress.processed_count / progress.total_count) * 100) : 0;
  const isDone = progress && progress.status !== 'running';
  const hasErrors = progress && progress.error_count > 0;

  function formatEta(seconds) {
    if (seconds === null || seconds === undefined) return null;
    if (seconds < 60) return `±${seconds} detik lagi`;
    return `±${Math.round(seconds / 60)} menit lagi`;
  }

  return (
    <main className="min-h-screen px-6 md:px-10 py-8 max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-xs text-muted hover:text-ink mb-6 inline-block">
        ← Kembali ke dashboard
      </Link>

      <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">
        Creator Pulse
      </p>
      <h1 className="font-display text-2xl text-ink mb-2">Tambah link video</h1>
      <p className="text-muted text-sm mb-8">
        Tempel link TikTok, satu link per baris. Scraping berjalan otomatis di background.
      </p>

      {!job && (
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-xs font-medium text-muted mb-1.5">
              Nama batch <span className="text-muted/60">(opsional)</span>
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="Contoh: Kampanye Ramadan - Wave 2"
              className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <p className="text-xs text-muted/70 mt-1">
              Kosongkan untuk pakai nama otomatis berdasarkan tanggal & waktu.
            </p>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={12}
            placeholder={'https://vt.tiktok.com/xxxxxxx/\nhttps://www.tiktok.com/@user/video/123...\n...'}
            className="w-full rounded-md border border-line bg-white px-3.5 py-3 text-sm font-mono outline-none focus:border-accent focus:ring-1 focus:ring-accent resize-y"
          />

          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-muted tabular">{linkCount} link terdeteksi</span>
            <button
              type="submit"
              disabled={submitting || linkCount === 0}
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

          {/* Fitur C: ETA */}
          {!isDone && progress?.eta_seconds != null && (
            <p className="text-xs text-muted mt-2">{formatEta(progress.eta_seconds)}</p>
          )}

          {/* Fitur D: error surfacing real-time */}
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
                href="/dashboard"
                className="rounded-md bg-ink text-white text-sm font-medium px-4 py-2 hover:bg-black transition-colors"
              >
                Lihat hasil di dashboard
              </Link>
              <button
                onClick={() => {
                  setJob(null);
                  setProgress(null);
                  setBatchName('');
                }}
                className="text-sm text-muted hover:text-ink"
              >
                Tambah link lagi
              </button>
            </div>
          )}

          {!isDone && (
            <p className="text-xs text-muted mt-4">
              Anda bisa tutup halaman ini — proses tetap berjalan di background. Cek dashboard nanti.
            </p>
          )}
        </div>
      )}
    </main>
  );
}
