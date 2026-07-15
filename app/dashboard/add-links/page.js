'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

export default function AddLinksPage() {
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [job, setJob] = useState(null); // { id, total }
  const [progress, setProgress] = useState(null); // row dari scrape_history
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
      body: JSON.stringify({ urls }),
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
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-ink">
              {isDone ? 'Selesai' : 'Sedang memproses…'}
            </span>
            <span className="text-xs text-muted tabular">
              {progress ? `${progress.processed_count} / ${progress.total_count}` : `0 / ${job.total}`}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-paper border border-line overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>

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
