'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STATUS_STYLE = {
  running: { label: 'Berjalan', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  success: { label: 'Selesai', className: 'bg-accentSoft text-accent border-accent/30' },
  failed: { label: 'Gagal', className: 'bg-red-50 text-red-600 border-red-200' },
  partial: { label: 'Sebagian Gagal', className: 'bg-orange-50 text-orange-600 border-orange-200' },
};

export default function CampaignsGrid({ campaigns }) {
  const [items, setItems] = useState(campaigns);
  const itemsRef = useRef(campaigns);
  const router = useRouter();

  // Sinkron kalau server component fetch ulang (misal setelah router.refresh())
  useEffect(() => {
    setItems(campaigns);
  }, [campaigns]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const current = itemsRef.current;
      const runningIds = current.filter((c) => c.status === 'running').map((c) => c.batch_id);
      if (runningIds.length === 0) return;

      let anyJustFinished = false;
      const updates = await Promise.all(
        runningIds.map(async (id) => {
          try {
            const res = await fetch(`/api/scrape-status/${id}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (data.status !== 'running') anyJustFinished = true;
            return { id, data };
          } catch {
            return null;
          }
        })
      );

      setItems((prev) =>
        prev.map((c) => {
          const found = updates.find((u) => u && u.id === c.batch_id);
          if (!found) return c;
          return {
            ...c,
            status: found.data.status,
            processed_count: found.data.processed_count,
            total_count: found.data.total_count,
          };
        })
      );

      // Kalau ada job yang baru selesai, refresh data server supaya
      // video_count/total_views/avg_er ikut update (angka-angka itu
      // tidak dikirim endpoint scrape-status, cuma dari batch_summary view)
      if (anyJustFinished) {
        router.refresh();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [router]);

  const hasRunning = items.some((c) => c.status === 'running');

  return (
    <div>
      {hasRunning && (
        <p className="text-xs text-amber-600 mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Ada campaign yang sedang diproses — halaman ini update otomatis
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((c) => {
          const statusInfo = STATUS_STYLE[c.status] || STATUS_STYLE.running;
          const percent =
            c.total_count > 0 ? Math.round((c.processed_count / c.total_count) * 100) : 0;

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
                <div className="mt-3">
                  <div className="w-full h-1.5 rounded-full bg-paper border border-line overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-amber-600 mt-1.5">
                    {c.processed_count}/{c.total_count} link diproses...
                  </p>
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
