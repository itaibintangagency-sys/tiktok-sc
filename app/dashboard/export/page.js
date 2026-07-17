'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { videosToCsv, downloadCsv, buildExportFilename, slugify } from '@/lib/csv-export';

const TEMPLATES = [
  {
    id: 'ringkasan',
    label: 'Ringkasan Performa Umum',
    build: (m) =>
      `Saya melampirkan data performa ${m.totalVideo} video TikTok dari ${m.totalCreator} creator${
        m.campaignName ? ` dalam campaign "${m.campaignName}"` : ''
      }${m.tanggalMulai ? `, periode ${m.tanggalMulai}–${m.tanggalAkhir}` : ''}. Total views: ${m.totalViews.toLocaleString('id-ID')}, rata-rata engagement rate: ${m.avgEr.toFixed(2)}%. Tolong buatkan ringkasan eksekutif: (1) performa keseluruhan campaign ini dibanding ekspektasi umum industri, (2) 3 insight utama yang paling penting untuk brand ketahui, (3) kesimpulan singkat dalam 2-3 kalimat yang bisa langsung dipakai untuk laporan ke klien.`,
  },
  {
    id: 'ranking',
    label: 'Ranking & Perbandingan Antar-Creator',
    build: (m) =>
      `Data terlampir berisi performa video dari ${m.totalCreator} creator berbeda. Tolong urutkan dan analisis: (1) 5 creator dengan performa terbaik dan apa yang membuat mereka menonjol (views, ER, atau konsistensi), (2) 5 creator dengan performa di bawah rata-rata dan kemungkinan penyebabnya, (3) apakah ada pola antara jumlah video yang diposting dengan performa rata-ratanya.`,
  },
  {
    id: 'anomali',
    label: 'Deteksi Anomali & Outlier',
    build: () =>
      `Dari data video terlampir, cari video-video yang performanya jauh menyimpang dari rata-rata — baik yang jauh di atas (viral/breakout) maupun jauh di bawah (underperform parah). Untuk tiap outlier yang ditemukan, coba identifikasi caption/pola konten yang mungkin jadi faktor penyebabnya, dan apakah ada kesamaan di antara video-video outlier tersebut.`,
  },
  {
    id: 'strategi',
    label: 'Rekomendasi Strategi Konten Selanjutnya',
    build: () =>
      `Berdasarkan data video terlampir (caption, views, likes, ER per video), tolong analisis pola konten yang paling engaging — jenis hook, tema caption, atau gaya yang berulang di video berperforma tinggi. Berikan 3-5 rekomendasi konkret untuk jenis konten yang sebaiknya diproduksi lebih banyak di batch berikutnya, dan jenis konten yang sebaiknya dikurangi/dievaluasi.`,
  },
  {
    id: 'kualitas',
    label: 'Kualitas Engagement (Bukan Cuma Angka)',
    build: () =>
      `Data ini punya kolom Views, Likes, Comments, Saves, dan Shares terpisah. Tolong analisis rasio antar-metrik ini (bukan cuma total views) — video mana yang punya rasio save/share tinggi (indikasi konten dianggap 'bernilai', bukan cuma lucu sesaat) vs video yang cuma tinggi views tapi rendah save/share (kemungkinan konten 'sekali tonton'). Berikan insight soal tipe konten mana yang lebih baik untuk tujuan jangka panjang (brand recall) vs jangkauan cepat (awareness).`,
  },
];

export default function ExportPage() {
  const [role, setRole] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [creators, setCreators] = useState([]);
  const [batchesInCampaign, setBatchesInCampaign] = useState([]);

  const [scope, setScope] = useState('all'); // all | campaign | creator
  const [selectedCampaignId, setSelectedCampaignId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedUsername, setSelectedUsername] = useState('');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { videos, meta }
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/me')
      .then((res) => res.json())
      .then((data) => setRole(data.role || 'admin'))
      .catch(() => setRole('admin'));

    fetch('/api/campaigns')
      .then((res) => res.json())
      .then((data) => setCampaigns(data.campaigns || []))
      .catch(() => {});

    fetch('/api/creators')
      .then((res) => res.json())
      .then((data) => setCreators(data.creators || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (scope !== 'campaign' || !selectedCampaignId) {
      setBatchesInCampaign([]);
      setSelectedBatchId('');
      return;
    }
    fetch(`/api/campaigns/${selectedCampaignId}/batches`)
      .then((res) => res.json())
      .then((data) => setBatchesInCampaign(data.batches || []))
      .catch(() => {});
  }, [scope, selectedCampaignId]);

  // Reset hasil preview setiap kali scope/pilihan berubah
  useEffect(() => {
    setResult(null);
  }, [scope, selectedCampaignId, selectedBatchId, selectedUsername]);

  async function handlePreview() {
    setLoading(true);
    setResult(null);

    const params = new URLSearchParams({ scope });
    if (scope === 'campaign') {
      params.set('campaignId', selectedCampaignId);
      if (selectedBatchId) params.set('batchId', selectedBatchId);
    }
    if (scope === 'creator') {
      params.set('username', selectedUsername);
    }

    try {
      const res = await fetch(`/api/export-data?${params.toString()}`);
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  function handleDownloadCsv() {
    if (!result) return;
    const csvContent = videosToCsv(result.videos);
    const contextName =
      result.meta.campaignName || result.meta.username || 'semua-data';
    const filename = buildExportFilename({
      contextName,
      usernameFilter: result.meta.scope === 'creator' ? result.meta.username : null,
      monthFilter: null,
    });
    downloadCsv(csvContent, filename);
  }

  const activeTemplate = TEMPLATES.find((t) => t.id === templateId);
  const promptText = result ? activeTemplate.build(result.meta) : '';

  async function handleCopyPrompt() {
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const canPreview =
    scope === 'all' || (scope === 'campaign' && selectedCampaignId) || (scope === 'creator' && selectedUsername);

  return (
    <main className="min-h-screen px-6 md:px-10 py-8 max-w-3xl mx-auto">
      <Link
        href={role === 'super_admin' ? '/dashboard/campaigns' : '/dashboard/my-batches'}
        className="text-xs text-muted hover:text-ink mb-6 inline-block"
      >
        ← Kembali
      </Link>

      <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">
        Creator Pulse
      </p>
      <h1 className="font-display text-2xl text-ink mb-2">Export & Analisis AI</h1>
      <p className="text-muted text-sm mb-8">
        Pilih data yang mau dianalisis, download CSV-nya, lalu copy prompt siap-pakai
        untuk di-attach ke Claude/ChatGPT bersama file CSV-nya.
      </p>

      {/* Step 1: Pilih scope */}
      <div className="border border-line rounded-lg bg-white p-6 mb-4">
        <h2 className="font-display text-base text-ink mb-4">1. Pilih Data</h2>

        <div className="inline-flex rounded-md border border-line p-0.5 bg-white mb-4">
          {[
            { id: 'all', label: 'Semua data' },
            { id: 'campaign', label: 'Campaign tertentu' },
            { id: 'creator', label: 'Creator tertentu' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setScope(opt.id)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                scope === opt.id ? 'bg-ink text-white' : 'text-muted'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {scope === 'campaign' && (
          <div className="space-y-3">
            <select
              value={selectedCampaignId}
              onChange={(e) => setSelectedCampaignId(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            >
              <option value="">Pilih campaign...</option>
              {campaigns.map((c) => (
                <option key={c.campaign_id} value={c.campaign_id}>
                  {c.campaign_name}
                </option>
              ))}
            </select>

            {selectedCampaignId && batchesInCampaign.length > 0 && (
              <select
                value={selectedBatchId}
                onChange={(e) => setSelectedBatchId(e.target.value)}
                className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
              >
                <option value="">Semua batch dalam campaign ini</option>
                {batchesInCampaign.map((b) => (
                  <option key={b.batch_id} value={b.batch_id}>
                    Hanya: {b.batch_name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {scope === 'creator' && (
          <select
            value={selectedUsername}
            onChange={(e) => setSelectedUsername(e.target.value)}
            className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          >
            <option value="">Pilih creator...</option>
            {creators.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}

        <button
          type="button"
          onClick={handlePreview}
          disabled={!canPreview || loading}
          className="mt-4 rounded-md bg-ink text-white text-sm font-medium px-4 py-2.5 hover:bg-black transition-colors disabled:opacity-50"
        >
          {loading ? 'Memuat...' : 'Tampilkan Preview'}
        </button>
      </div>

      {/* Step 2: Preview + download */}
      {result && (
        <div className="border border-line rounded-lg bg-white p-6 mb-4">
          <h2 className="font-display text-base text-ink mb-4">2. Preview & Download</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="border border-line rounded-md px-3 py-2.5">
              <p className="text-[11px] text-muted mb-0.5">Video</p>
              <p className="text-lg font-medium text-ink tabular">{result.meta.totalVideo}</p>
            </div>
            <div className="border border-line rounded-md px-3 py-2.5">
              <p className="text-[11px] text-muted mb-0.5">Creator</p>
              <p className="text-lg font-medium text-ink tabular">{result.meta.totalCreator}</p>
            </div>
            <div className="border border-line rounded-md px-3 py-2.5">
              <p className="text-[11px] text-muted mb-0.5">Views</p>
              <p className="text-lg font-medium text-ink tabular">
                {result.meta.totalViews.toLocaleString('id-ID')}
              </p>
            </div>
            <div className="border border-line rounded-md px-3 py-2.5">
              <p className="text-[11px] text-muted mb-0.5">Avg ER</p>
              <p className="text-lg font-medium text-ink tabular">{result.meta.avgEr.toFixed(2)}%</p>
            </div>
          </div>

          {result.meta.totalVideo === 0 && (
            <p className="text-sm text-muted mb-4">
              Tidak ada video yang cocok dengan pilihan ini.
            </p>
          )}

          {result.meta.totalVideo > 2000 && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-2 mb-4">
              Datanya cukup besar ({result.meta.totalVideo} baris) — Excel/Google Sheets mungkin
              terasa lambat saat dibuka, tapi filenya tetap valid.
            </p>
          )}

          <button
            type="button"
            onClick={handleDownloadCsv}
            disabled={result.meta.totalVideo === 0}
            className="rounded-md bg-ink text-white text-sm font-medium px-4 py-2.5 hover:bg-black transition-colors disabled:opacity-50"
          >
            ↓ Download CSV
          </button>
        </div>
      )}

      {/* Step 3: Pilih & copy prompt */}
      {result && result.meta.totalVideo > 0 && (
        <div className="border border-line rounded-lg bg-white p-6">
          <h2 className="font-display text-base text-ink mb-4">3. Pilih Prompt untuk AI</h2>

          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent mb-3"
          >
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>

          <div className="rounded-md border border-line bg-paper p-4 text-sm text-ink leading-relaxed mb-3 whitespace-pre-wrap">
            {promptText}
          </div>

          <button
            type="button"
            onClick={handleCopyPrompt}
            className="rounded-md bg-ink text-white text-sm font-medium px-4 py-2.5 hover:bg-black transition-colors"
          >
            {copied ? '✓ Tersalin!' : '⧉ Copy Prompt'}
          </button>

          <p className="text-xs text-muted mt-4">
            Buka Claude atau ChatGPT → attach file CSV yang baru di-download → paste prompt
            ini → kirim.
          </p>
        </div>
      )}
    </main>
  );
}
