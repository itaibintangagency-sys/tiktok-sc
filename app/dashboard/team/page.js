'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function TeamPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'admin' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  async function loadTeam() {
    setLoading(true);
    const res = await fetch('/api/team');
    const json = await res.json();
    setData(json);
    setLoading(false);
  }

  useEffect(() => {
    loadTeam();
  }, []);

  async function handleInvite(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    const res = await fetch('/api/team/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      setError(json.error || 'Gagal menambah akun.');
      return;
    }

    setSuccessMsg(`Akun ${form.email} berhasil dibuat sebagai ${form.role}.`);
    setForm({ email: '', password: '', fullName: '', role: 'admin' });
    loadTeam();
  }

  if (loading) {
    return (
      <main className="min-h-screen px-6 md:px-10 py-8 max-w-3xl mx-auto">
        <p className="text-sm text-muted">Memuat...</p>
      </main>
    );
  }

  const { profiles, slots } = data;

  return (
    <main className="min-h-screen px-6 md:px-10 py-8 max-w-3xl mx-auto">
      <Link href="/dashboard/campaigns" className="text-xs text-muted hover:text-ink mb-6 inline-block">
        ← Kembali ke campaigns
      </Link>

      <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">
        Creator Pulse
      </p>
      <h1 className="font-display text-2xl text-ink mb-2">Kelola Tim</h1>
      <p className="text-muted text-sm mb-8">
        Tambah akun Super Admin atau Admin baru. Pendaftaran mandiri sudah ditutup —
        semua akun dibuat dari sini.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="border border-line rounded-lg bg-white px-4 py-3.5">
          <p className="text-xs text-muted mb-1">Super Admin</p>
          <p className="font-display text-2xl text-ink tabular">
            {slots.super_admin.used} / {slots.super_admin.max}
          </p>
        </div>
        <div className="border border-line rounded-lg bg-white px-4 py-3.5">
          <p className="text-xs text-muted mb-1">Admin</p>
          <p className="font-display text-2xl text-ink tabular">
            {slots.admin.used} / {slots.admin.max}
          </p>
        </div>
      </div>

      <div className="border border-line rounded-lg bg-white p-6 mb-8">
        <h2 className="font-display text-base text-ink mb-4">Tambah Akun Baru</h2>
        <form onSubmit={handleInvite} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Nama</label>
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-accent"
              >
                <option value="admin">Admin</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}
          {successMsg && (
            <p className="text-sm text-accent bg-accentSoft border border-accent/20 rounded-md px-3 py-2">
              {successMsg}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-ink text-white text-sm font-medium px-4 py-2 hover:bg-black transition-colors disabled:opacity-50"
          >
            {submitting ? 'Membuat...' : 'Buat Akun'}
          </button>
        </form>
      </div>

      <div className="border border-line rounded-lg bg-white p-6">
        <h2 className="font-display text-base text-ink mb-4">Anggota Tim</h2>
        <div className="space-y-2">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between border-b border-line-soft last:border-0 py-2.5"
            >
              <div>
                <p className="text-sm text-ink font-medium">{p.full_name || '(tanpa nama)'}</p>
                <p className="text-xs text-muted">
                  Bergabung {new Date(p.created_at).toLocaleDateString('id-ID')}
                </p>
              </div>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                  p.role === 'super_admin'
                    ? 'bg-accentSoft text-accent border-accent/30'
                    : 'bg-paper text-muted border-line'
                }`}
              >
                {p.role === 'super_admin' ? 'Super Admin' : 'Admin'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
