// components/ScrapeProgress.js

'use client';

import { useEffect, useState } from 'react';

function formatEta(seconds) {
  if (seconds === null) return '';
  if (seconds < 60) return `±${seconds} detik lagi`;
  const minutes = Math.round(seconds / 60);
  return `±${minutes} menit lagi`;
}

export default function ScrapeProgress({ jobId }) {
  const [data, setData] = useState(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/scrape-status/${jobId}`);
        const json = await res.json();
        if (active) setData(json);
      } catch {
        // biarkan polling berikutnya coba lagi
      }
    }

    poll();
    const interval = setInterval(() => {
      if (data?.status !== 'completed' && data?.status !== 'failed') {
        poll();
      }
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId, data?.status]);

  if (!data) {
    return <p className="text-sm text-gray-500">Memuat status...</p>;
  }

  const percent =
    data.total_count > 0 ? Math.round((data.processed_count / data.total_count) * 100) : 0;

  const isDone = data.status === 'completed';
  const hasErrors = data.error_count > 0;

  return (
    <div className="rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <p className="font-medium text-gray-900">
          {isDone ? 'Selesai' : 'Sedang memproses...'}
        </p>
        <p className="text-sm text-gray-500">
          {data.processed_count} / {data.total_count}
        </p>
      </div>

      {data.batch_name && (
        <p className="mt-1 text-xs text-gray-400">Batch: {data.batch_name}</p>
      )}

      <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-emerald-700 transition-all duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>

      {!isDone && data.eta_seconds !== null && (
        <p className="mt-2 text-sm text-gray-500">{formatEta(data.eta_seconds)}</p>
      )}

      {hasErrors && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3">
          <button
            onClick={() => setShowErrors((s) => !s)}
            className="text-sm font-medium text-red-700 hover:underline"
          >
            {data.error_count} link gagal — {showErrors ? 'sembunyikan' : 'lihat detail'}
          </button>

          {showErrors && (
            <ul className="mt-2 space-y-1 text-xs text-red-600">
              {data.recent_errors.map((err, i) => (
                <li key={i} className="truncate">
                  {err.link}: {err.error_info}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {isDone && !hasErrors && (
        <p className="mt-2 text-sm text-emerald-700">Semua link berhasil diproses.</p>
      )}

      <p className="mt-3 text-xs text-gray-400">
        Anda bisa tutup halaman ini — proses tetap berjalan di background. Cek dashboard nanti.
      </p>
    </div>
  );
}
