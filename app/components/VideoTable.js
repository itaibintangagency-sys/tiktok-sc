'use client';

import { useMemo, useState } from 'react';

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

export default function VideoTable({ videos, onSelectVideo, selectedId }) {
  const [search, setSearch] = useState('');
  const [usernameFilter, setUsernameFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [sortKey, setSortKey] = useState('post_date');
  const [sortDir, setSortDir] = useState('desc');
  const [viewMode, setViewMode] = useState('creator'); // 'creator' | 'batch'

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

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  function exportToCsv() {
    const headers = [
      'Creator',
      'Caption',
      'Views',
      'Likes',
      'Comments',
      'Saves',
      'Shares',
      'ER (%)',
      'Tanggal',
      'Batch',
      'Link',
    ];

    const escapeCsv = (val) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filtered.map((v) => [
      v.username || '',
      v.caption || '',
      v.views || 0,
      v.likes || 0,
      v.comments_count || 0,
      v.saves || 0,
      v.shares || 0,
      v.er || 0,
      v.post_date_display || '',
      v.batch_name || '',
      v.input_url || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsv).join(','))
      .join('\n');

    // Tambah BOM supaya Excel baca UTF-8 dengan benar (karakter emoji/simbol di caption)
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `creator-pulse-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
          className="text-xs font-medium text-muted hover:text-ink border border-line rounded-md px-3 py-2 transition-colors"
        >
          ↓ Export CSV
        </button>

        <span className="text-xs text-muted ml-auto tabular">
          {filtered.length} dari {videos.length} video
        </span>
      </div>

      {viewMode === 'creator' && (
        <VideoRows
          rows={filtered}
          onSelectVideo={onSelectVideo}
          selectedId={selectedId}
          sortKey={sortKey}
          sortDir={sortDir}
          toggleSort={toggleSort}
        />
      )}

      {viewMode === 'batch' &&
        grouped.map(([batchId, group]) => (
          <div key={batchId} className="mb-6">
            <h3 className="font-display text-sm text-ink mb-2">
              {group.batchName}{' '}
              <span className="font-sans font-normal text-xs text-muted">
                ({group.rows.length} video)
              </span>
            </h3>
            <VideoRows
              rows={group.rows}
              onSelectVideo={onSelectVideo}
              selectedId={selectedId}
              sortKey={sortKey}
              sortDir={sortDir}
              toggleSort={toggleSort}
            />
          </div>
        ))}
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
