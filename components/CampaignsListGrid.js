'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CampaignsListGrid({ campaigns }) {
  const [items, setItems] = useState(campaigns);
  const itemsRef = useRef(campaigns);
  const router = useRouter();

  useEffect(() => {
    setItems(campaigns);
  }, [campaigns]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useEffect(() => {
    const interval = setInterval(async () => {
      const current = itemsRef.current;
      const withRunning = current.filter((c) => c.has_running_batch && c.running_batch_ids?.length);
      if (withRunning.length === 0) return;

      let anyJustFinished = false;

      const updates = await Promise.all(
        withRunning.map(async (c) => {
          const batchResults = await Promise.all(
            c.running_batch_ids.map(async (batchId) => {
              try {
                const res = await fetch(`/api/scrape-status/${batchId}`);
                if (!res.ok) return null;
                return await res.json();
              } catch {
                return null;
              }
            })
          );

          const valid = batchResults.filter(Boolean);
          const stillRunning = valid.filter((b) => b.status === 'running');
          if (stillRunning.length < valid.length) anyJustFinished = true;

          const processed = valid.reduce((sum, b) => sum + (b.processed_count || 0), 0);
          const total = valid.reduce((sum, b) => sum + (b.total_count || 0), 0);

          return { campaignId: c.campaign_id, processed, total, stillRunning: stillRunning.length > 0 };
        })
      );

      setItems((prev) =>
        prev.map((c) => {
          const found = updates.find((u) => u.campaignId === c.campaign_id);
          if (!found) return c;
          return {
            ...c,
            _liveProcessed: found.processed,
            _liveTotal: found.total,
            has_running_batch: found.stillRunning,
          };
        })
      );

      if (anyJustFinished) router.refresh();
    }, 3000);

    return () => clearInterval(interval);
  }, [router]);

  const hasAnyRunning = items.some((c) => c.has_running_batch);

  return (
    <div>
      {hasAnyRunning && (
        <p className="text-xs text-amber-600 mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
          Ada campaign yang sedang diproses — halaman ini update otomatis
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((c) => {
          const percent =
            c._liveTotal > 0 ? Math.round((c._liveProcessed / c._liveTotal) * 100) : null;

          return (
            <Link
              key={c.campaign_id}
              href={`/dashboard/campaigns/${c.campaign_id}`}
              className="border border-line rounded-lg bg-white p-5 hover:border-accent transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-display text-base text-ink group-hover:text-accent transition-colors pr-2">
                  {c.campaign_name}
                </h3>
                {c.has_running_batch && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full border whitespace-nowrap bg-amber-50 text-amber-700 border-amber-200">
                    Berjalan
                  </span>
                )}
              </div>

              <p className="text-xs text-muted mb-4">
                {c.batch_count} batch
                {c.last_batch_at &&
                  ` · terakhir ${new Date(c.last_batch_at).toLocaleDateString('id-ID', {
                    day: '2-digit',
                    month: 'short',
                  })}`}
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

              {c.has_running_batch && percent !== null && (
                <div className="mt-3">
                  <div className="w-full h-1.5 rounded-full bg-paper border border-line overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-500"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-amber-600 mt-1.5">
                    {c._liveProcessed}/{c._liveTotal} link diproses...
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
