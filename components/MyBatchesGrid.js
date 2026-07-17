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

export default function MyBatchesGrid({ batches }) {
  const [items, setItems] = useState(batches);
  const itemsRef = useRef(batches);
  const router = useRouter();

  useEffect(() => {
    setItems(batches);
  }, [batches]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const runningIds = itemsRef.current
        .filter((b) => b.status === 'running')
        .map((b) => b.batch_id);
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
        prev.map((b) => {
          const found = updates.find((u) => u && u.id === b.batch_id);
          if (!found) return b;
          return { ...b, status: found.data.status, processed_count: found.data.processed_count };
        })
      );

      if (anyJustFinished) router.refresh();
    }, 3000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((b) => {
        const statusInfo = STATUS_STYLE[b.status] || STATUS_STYLE.running;
        const percent =
          b.total_count > 0 ? Math.round((b.processed_count / b.total_count) * 100) : 0;

        return (
          <Link
            key={b.batch_id}
            href={`/dashboard?batch=${b.batch_id}`}
            className="border border-line rounded-lg bg-white p-5 hover:border-accent transition-colors group"
          >
            <p className="text-[11px] text-muted mb-1 uppercase tracking-wide">
              {b.campaign_name || 'Tanpa campaign'}
            </p>
            <div className="flex items-start justify-between mb-3">
              <h3 className="font-display text-base text-ink group-hover:text-accent transition-colors pr-2">
                {b.batch_name}
              </h3>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap ${statusInfo.className}`}
              >
                {statusInfo.label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-line">
              <div>
                <p className="text-[11px] text-muted mb-0.5">Video</p>
                <p className="text-sm font-medium text-ink tabular">{b.video_count}</p>
              </div>
              <div>
                <p className="text-[11px] text-muted mb-0.5">Views</p>
                <p className="text-sm font-medium text-ink tabular">
                  {Number(b.total_views || 0).toLocaleString('id-ID')}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted mb-0.5">Avg ER</p>
                <p className="text-sm font-medium text-ink tabular">
                  {Number(b.avg_er || 0).toFixed(1)}%
                </p>
              </div>
            </div>

            {b.status === 'running' && (
              <div className="mt-3">
                <div className="w-full h-1.5 rounded-full bg-paper border border-line overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-500"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-amber-600 mt-1.5">
                  {b.processed_count}/{b.total_count} link diproses...
                </p>
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
