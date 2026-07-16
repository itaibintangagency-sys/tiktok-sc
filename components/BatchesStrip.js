'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const STATUS_DOT = {
  running: 'bg-amber-500 animate-pulse',
  success: 'bg-accent',
  failed: 'bg-red-500',
  partial: 'bg-orange-500',
};

export default function BatchesStrip({ batches, campaignId }) {
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

  if (items.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-display text-sm text-ink">Batch dalam campaign ini</h2>
        <Link
          href={`/dashboard/add-links?campaign=${campaignId}`}
          className="text-xs font-medium text-accent hover:underline"
        >
          + Tambah batch
        </Link>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((b) => (
          <div
            key={b.batch_id}
            className="flex items-center gap-2 border border-line rounded-md bg-white px-3 py-2 text-xs whitespace-nowrap"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[b.status] || STATUS_DOT.running}`} />
            <span className="font-medium text-ink">{b.batch_name}</span>
            <span className="text-muted tabular">
              {b.status === 'running' ? `${b.processed_count}/${b.total_count}` : `${b.video_count} video`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
