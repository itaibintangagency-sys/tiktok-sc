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

  function toggleSort(key) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
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
        <span className="text-xs text-muted ml-auto tabular">
          {filtered.length} dari {videos.length} video
        </span>
      </div>

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
            </tr>
          </thead>
          <tbody>
            {filtered.map((v) => (
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
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={COLUMNS.length} className="px-3 py-8 text-center text-muted text-sm">
                  Tidak ada video yang cocok dengan filter ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
