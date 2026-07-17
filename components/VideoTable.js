'use client';

import { useEffect, useMemo, useState } from 'react';
import { videosToCsv, downloadCsv, buildExportFilename } from '@/lib/csv-export';

const COLUMNS = [
  { key: 'username', label: 'Creator' },
  { key: 'caption', label: 'Caption' },
  { key: 'views', label: 'Views', numeric: true },
  { key: 'likes', label: 'Likes', numeric: true },
  { key: 'comments_count', label: 'Comments', numeric: true },
  { key: 'saves', label: 'Saves', numeric: true },
  { key: 'shares', label: 'Shares', numeric: true },
  { key: 'er', label: 'ER', numeric: true },
  { key: 'post_date_display', label: 'Tanggal' },
];

const PAGE_SIZE_OPTIONS = [10, 30, 50, 100, 300, 500];

export default function VideoTable({ videos, onSelectVideo, selectedId, exportContext }) {
  const [search, setSearch] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [sortKey, setSortKey] = useState('post_date');
  const [sortDir, setSortDir] = useState('desc');
  const [viewMode, setViewMode] = useState('creator'); // 'creator' | 'batch'
  const [pageSize, setPageSize] = useState(50);
  const [page, setPage] = useState(1); // dipakai mode 'creator'
  const [batchPages, setBatchPages] = useState({}); // dipakai mode 'batch', per batchId

  const usernames = useMemo(
    () => Array.from(new Set(videos.map((v) => v.username).filter(Boolean))).sort(),
    [videos]
  );
  const months = useMemo(
    () =>
      Array.from(new Set(videos.map((v) => v.month).filter(Boolean))).sort((a, b) => a - b),
    [videos]
  );

  const filtered = useMemo(() => {
    let rows = videos;

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (v) =>
          v.caption?.toLowerCase().includes(q) || v.username?.toLowerCase().includes(q)
      );
    }
    if (usernameFilter !== 'all') {
      rows = rows.filter((v) => v.username === usernameFilter);
    }
    if (monthFilter !== 'all') {
      rows = rows.filter((v) => String(v.month) === monthFilter);
    }

    rows = [...rows].sort((a, b) => {
      let av = a[sortKey];
      let bv = b[sortKey];
      if (sortKey === 'er') {
        av = Number(av) || 0;
        bv = Number(bv) || 0;
      }
      if (av == null) av = '';
      if (bv == null) bv = '';
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [videos, search, usernameFilter, monthFilter, sortKey, sortDir]);

  // Kelompokkan hasil filter berdasarkan batch (dipakai kalau viewMode === 'batch')
  // Butuh field v.batch_id dan v.batch_name di setiap row — lihat catatan di
  // bawah file ini soal query fetch yang perlu di-join.
  const grouped = useMemo(() => {
    if (viewMode !== 'batch') return null;
    const map = new Map();
    for (const v of filtered) {
      const key = v.batch_id || 'tanpa-batch';
      if (!map.has(key)) {
        map.set(key, { batchName: v.batch_name || 'Tanpa Batch', rows: [] });
      }
      map.get(key).rows.push(v);
    }
    return Array.from(map.entries());
  }, [filtered, viewMode]);

  // Reset ke halaman 1 setiap kali filter/pageSize/viewMode berubah —
  // supaya tidak "nyangkut" di halaman 5 padahal hasil filter cuma 1 halaman
  useEffect(() => {
    setPage(1);
    setBatchPages({});
  }, [search, usernameFilter, monthFilter, pageSize, viewMode, sortKey, sortDir]);

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function exportToCsv() {
    const csvContent = videosToCsv(filtered);
    const filename = buildExportFilename({
      contextName: exportContext,
      usernameFilter,
      monthFilter,
    });
    downloadCsv(csvContent, filename);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <input
          type="text"
          placeholder="Cari caption atau creator…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <select
          value={usernameFilter}
          onChange={(e) => setUsernameFilter(e.target.value)}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="all">Semua creator</option>
          {usernames.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="all">Semua bulan</option>
          {months.map((m) => (
            <option key={m} value={m}>
              Bulan {m}
            </option>
          ))}
        </select>

        <div className="inline-flex rounded-md border border-line p-0.5 bg-white">
          <button
            type="button"
            onClick={() => setViewMode('creator')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === 'creator' ? 'bg-ink text-white' : 'text-muted hover:text-ink'
            }`}
          >
            Per Creator
          </button>
          <button
            type="button"
            onClick={() => setViewMode('batch')}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
              viewMode === 'batch' ? 'bg-ink text-white' : 'text-muted hover:text-ink'
            }`}
          >
            Per Batch
          </button>
        </div>

        <button
          type="button"
          onClick={exportToCsv}
          title={`Export ${filtered.length} video sesuai filter aktif (mengabaikan halaman yang sedang dilihat)`}
          className="text-xs font-medium text-muted hover:text-ink border border-line rounded-md px-3 py-2 transition-colors"
        >
          ↓ Export CSV ({filtered.length})
        </button>

        <select
          value={pageSize}
          onChange={(e) => setPageSize(Number(e.target.value))}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm outline-none focus:border-accent"
          title="Jumlah baris per halaman"
        >
          {PAGE_SIZE_OPTIONS.map((n) => (
            <option key={n} value={n}>
              {n} / halaman
            </option>
          ))}
        </select>

        <span className="text-xs text-muted ml-auto tabular">
          {filtered.length} dari {videos.length} video
        </span>
      </div>

      {viewMode === 'creator' && (() => {
        const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
        const currentPage = Math.min(page, totalPages);
        const pagedRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
        return (
          <>
            <VideoRows
              rows={pagedRows}
              onSelectVideo={onSelectVideo}
              selectedId={selectedId}
              sortKey={sortKey}
              sortDir={sortDir}
              toggleSort={toggleSort}
            />
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={pageSize}
              onChange={setPage}
            />
          </>
        );
      })()}

      {viewMode === 'batch' &&
        grouped.map(([batchId, group]) => {
          const bp = batchPages[batchId] || 1;
          const totalPages = Math.max(1, Math.ceil(group.rows.length / pageSize));
          const currentPage = Math.min(bp, totalPages);
          const pagedRows = group.rows.slice(
            (currentPage - 1) * pageSize,
            currentPage * pageSize
          );
          return (
            <div key={batchId} className="mb-6">
              <h3 className="font-display text-sm text-ink mb-2">
                {group.batchName}{' '}
                <span className="font-sans font-normal text-xs text-muted">
                  ({group.rows.length} video)
                </span>
              </h3>
              <VideoRows
                rows={pagedRows}
                onSelectVideo={onSelectVideo}
                selectedId={selectedId}
                sortKey={sortKey}
                sortDir={sortDir}
                toggleSort={toggleSort}
              />
              <Pagination
                page={currentPage}
                totalPages={totalPages}
                totalItems={group.rows.length}
                pageSize={pageSize}
                onChange={(p) => setBatchPages((prev) => ({ ...prev, [batchId]: p }))}
              />
            </div>
          );
        })}
    </div>
  );
}

function Pagination({ page, totalPages, totalItems, pageSize, onChange }) {
  if (totalItems === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);

  return (
    <div className="flex items-center justify-between mt-2 px-1">
      <span className="text-[11px] text-muted tabular">
        Menampilkan {start}–{end} dari {totalItems}
      </span>

      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(page - 1)}
            disabled={page <= 1}
            className="text-xs font-medium text-muted hover:text-ink border border-line rounded-md px-2.5 py-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Prev
          </button>
          <span className="text-[11px] text-muted tabular">
            Hal {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => onChange(page + 1)}
            disabled={page >= totalPages}
            className="text-xs font-medium text-muted hover:text-ink border border-line rounded-md px-2.5 py-1 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

function VideoRows({ rows, onSelectVideo, selectedId, sortKey, sortDir, toggleSort }) {
  return (
    <div className="overflow-x-auto border border-line rounded-lg bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-paper">
            {COLUMNS.map((col) => (
              <th
                key={col.key}
                onClick={() => toggleSort(col.key)}
                className={`text-left font-medium text-muted px-3 py-2.5 cursor-pointer select-none whitespace-nowrap hover:text-ink transition-colors ${
                  col.key === 'caption' ? 'min-w-[240px]' : ''
                }`}
              >
                {col.label}
                {sortKey === col.key && (
                  <span className="ml-1 text-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>
                )}
              </th>
            ))}
            <th className="text-left font-medium text-muted px-3 py-2.5 whitespace-nowrap">
              Link
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((v) => (
            <tr
              key={v.id}
              onClick={() => onSelectVideo(v)}
              className={`border-b border-line last:border-0 cursor-pointer transition-colors hover:bg-accentSoft/40 ${
                selectedId === v.id ? 'bg-accentSoft' : ''
              }`}
            >
              <td className="px-3 py-2.5 font-medium text-ink whitespace-nowrap">
                {v.username || '—'}
              </td>
              <td className="px-3 py-2.5 text-ink/80 max-w-[320px] truncate">
                {v.caption || '—'}
              </td>
              <td className="px-3 py-2.5 tabular text-ink">
                {(v.views || 0).toLocaleString('id-ID')}
              </td>
              <td className="px-3 py-2.5 tabular text-ink">
                {(v.likes || 0).toLocaleString('id-ID')}
              </td>
              <td className="px-3 py-2.5 tabular text-ink">
                {(v.comments_count || 0).toLocaleString('id-ID')}
              </td>
              <td className="px-3 py-2.5 tabular text-ink">
                {(v.saves || 0).toLocaleString('id-ID')}
              </td>
              <td className="px-3 py-2.5 tabular text-ink">
                {(v.shares || 0).toLocaleString('id-ID')}
              </td>
              <td className="px-3 py-2.5 tabular">
                <span
                  className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                    Number(v.er) >= 5
                      ? 'bg-accentSoft text-accent'
                      : 'bg-paper text-muted'
                  }`}
                >
                  {v.er ?? 0}%
                </span>
              </td>
              <td className="px-3 py-2.5 text-muted whitespace-nowrap">
                {v.post_date_display || '—'}
              </td>
              <td className="px-3 py-2.5 whitespace-nowrap">
                {v.input_url && (
                  <a
                    href={v.input_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1 rounded-md border border-line px-2 py-1 text-xs text-muted hover:border-accent hover:text-accent transition-colors"
                    title="Buka video di TikTok"
                  >
                    ↗ Lihat
                  </a>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={COLUMNS.length + 1} className="px-3 py-8 text-center text-muted text-sm">
                Tidak ada video yang cocok dengan filter ini.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================
// CATATAN PENTING — Fitur "Per Batch" butuh 1 penyesuaian lagi:
//
// Video yang di-pass ke komponen ini (prop `videos`) perlu punya
// field `batch_id` dan `batch_name`. Kemungkinan besar itu di-fetch
// di file DashboardClient.js Anda. Query Supabase-nya perlu di-join,
// kira-kira begini:
//
//   const { data } = await supabase
//     .from('videos')
//     .select('*, scrape_history(batch_name)')
//     .order('post_date', { ascending: false });
//
//   const videos = data.map(v => ({
//     ...v,
//     batch_name: v.scrape_history?.batch_name ?? null,
//   }));
//
// Kirim isi DashboardClient.js kalau mau saya sesuaikan persis.
// ============================================================
