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
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [busyId, setBusyId] = useState(null);
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

  function startEdit(b) {
    setEditingId(b.batch_id);
    setEditName(b.batch_name || '');
    setEditDate(b.batch_date || '');
    setEditNotes(b.notes || '');
  }

  async function saveEdit(batchId) {
    setBusyId(batchId);
    try {
      const res = await fetch(`/api/batches/${batchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch_name: editName, batch_date: editDate, notes: editNotes }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Gagal menyimpan perubahan.');
        return;
      }
      setEditingId(null);
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function deleteBatch(b) {
    const confirmed = window.confirm(
      `Yakin hapus "${b.batch_name}"? Ini akan menghapus ${b.video_count} video secara permanen dan tidak bisa dibatalkan.`
    );
    if (!confirmed) return;

    setBusyId(b.batch_id);
    try {
      const res = await fetch(`/api/batches/${b.batch_id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Gagal menghapus batch.');
        return;
      }
      setItems((prev) => prev.filter((x) => x.batch_id !== b.batch_id));
      router.refresh();
    } finally {
      setBusyId(null);
    }
  }

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

      <div className="space-y-2">
        {items.map((b) => (
          <div key={b.batch_id} className="border border-line rounded-md bg-white p-3">
            {editingId === b.batch_id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Nama batch"
                  className="w-full rounded border border-line px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="rounded border border-line px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                  />
                  <input
                    type="text"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    placeholder="Keterangan (opsional)"
                    className="flex-1 rounded border border-line px-2.5 py-1.5 text-xs outline-none focus:border-accent"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(b.batch_id)}
                    disabled={busyId === b.batch_id}
                    className="text-xs font-medium text-white bg-ink rounded px-3 py-1.5 hover:bg-black disabled:opacity-50"
                  >
                    Simpan
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="text-xs text-muted hover:text-ink px-3 py-1.5"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      STATUS_DOT[b.status] || STATUS_DOT.running
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink truncate">{b.batch_name}</p>
                    <p className="text-[11px] text-muted">
                      {b.status === 'running'
                        ? `${b.processed_count}/${b.total_count} diproses...`
                        : `${b.video_count} video`}
                      {b.batch_date && ` · ${new Date(b.batch_date).toLocaleDateString('id-ID')}`}
                      {b.notes && ` · ${b.notes}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {b.status !== 'running' && (
                    <Link
                      href={`/dashboard/add-links?campaign=${campaignId}`}
                      className="text-[11px] text-accent hover:underline"
                    >
                      + Link
                    </Link>
                  )}
                  <button
                    onClick={() => startEdit(b)}
                    className="text-[11px] text-muted hover:text-ink"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteBatch(b)}
                    disabled={busyId === b.batch_id || b.status === 'running'}
                    className="text-[11px] text-red-500 hover:text-red-700 disabled:opacity-40"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
