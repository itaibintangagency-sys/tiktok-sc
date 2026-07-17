// lib/csv-export.js
//
// Utility bersama untuk export video ke CSV. Dipakai oleh tombol quick-export
// di VideoTable.js DAN nanti oleh halaman /dashboard/export (Part 3) — supaya
// format kolom selalu konsisten di satu tempat, tidak drift antar fitur.

const CSV_HEADERS = [
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

function escapeCsvValue(val) {
  const str = String(val ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function videosToCsv(videos) {
  const rows = videos.map((v) => [
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

  return [CSV_HEADERS, ...rows].map((row) => row.map(escapeCsvValue).join(',')).join('\n');
}

export function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function downloadCsv(csvContent, filename) {
  // BOM di depan supaya Excel baca UTF-8 dengan benar (emoji/simbol di caption)
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Bangun nama file deskriptif dari konteks aktif, contoh:
 * "ovale-creator-aily-shop9-2026-07-17.csv"
 * "ovale-semua-video-2026-07-17.csv"
 */
export function buildExportFilename({ contextName, usernameFilter, monthFilter }) {
  const parts = [slugify(contextName) || 'creator-pulse'];

  if (usernameFilter && usernameFilter !== 'all') {
    parts.push('creator', slugify(usernameFilter));
  }
  if (monthFilter && monthFilter !== 'all') {
    parts.push('bulan', monthFilter);
  }
  if (parts.length === 1) {
    parts.push('semua-video');
  }

  parts.push(new Date().toISOString().slice(0, 10));

  return parts.join('-') + '.csv';
}
