'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin' };

export default function ProfileClient({ email, fullName: initialFullName, role }) {
  const supabase = createClient();

  const [fullName, setFullName] = useState(initialFullName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameMsg, setNameMsg] = useState('');
  const [nameError, setNameError] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordError, setPasswordError] = useState('');

  async function handleSaveName(e) {
    e.preventDefault();
    setNameError('');
    setNameMsg('');
    setNameSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', user.id);

    setNameSaving(false);

    if (error) {
      setNameError('Gagal menyimpan nama: ' + error.message);
      return;
    }
    setNameMsg('Nama berhasil disimpan.');
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordMsg('');

    if (newPassword.length < 6) {
      setPasswordError('Password minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Konfirmasi password tidak cocok.');
      return;
    }

    setPasswordSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordSaving(false);

    if (error) {
      setPasswordError('Gagal mengganti password: ' + error.message);
      return;
    }

    setPasswordMsg('Password berhasil diganti.');
    setNewPassword('');
    setConfirmPassword('');
  }

  return (
    <main className="min-h-screen px-6 md:px-10 py-8 max-w-lg mx-auto">
      <Link href="/dashboard" className="text-xs text-muted hover:text-ink mb-6 inline-block">
        ← Kembali ke dashboard
      </Link>

      <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">
        Creator Pulse
      </p>
      <h1 className="font-display text-2xl text-ink mb-8">Profil Saya</h1>

      {/* Info akun */}
      <div className="border border-line rounded-lg bg-white p-6 mb-6">
        <h2 className="font-display text-base text-ink mb-4">Info Akun</h2>

        <div className="mb-4">
          <label className="block text-xs font-medium text-muted mb-1.5">Email</label>
          <input
            type="text"
            value={email}
            disabled
            className="w-full rounded-md border border-line bg-paper px-3.5 py-2.5 text-sm text-muted"
          />
          <p className="text-[11px] text-muted/70 mt-1">
            Email tidak bisa diubah sendiri — hubungi Super Admin kalau perlu diganti.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-muted mb-1.5">Role</label>
          <div>
            <span className="inline-block text-xs font-medium px-2.5 py-1 rounded-full bg-accentSoft text-accent border border-accent/30">
              {ROLE_LABEL[role] || 'Admin'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveName}>
          <label className="block text-xs font-medium text-muted mb-1.5">Nama</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama Anda"
              className="flex-1 rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
            <button
              type="submit"
              disabled={nameSaving}
              className="rounded-md bg-ink text-white text-sm font-medium px-4 py-2.5 hover:bg-black transition-colors disabled:opacity-50"
            >
              {nameSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
          {nameError && <p className="text-sm text-red-600 mt-2">{nameError}</p>}
          {nameMsg && <p className="text-sm text-accent mt-2">{nameMsg}</p>}
        </form>
      </div>

      {/* Ganti password */}
      <div className="border border-line rounded-lg bg-white p-6">
        <h2 className="font-display text-base text-ink mb-4">Ganti Password</h2>
        <form onSubmit={handleChangePassword} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Password Baru</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
              className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">
              Konfirmasi Password Baru
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
              className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
            />
          </div>

          {passwordError && <p className="text-sm text-red-600">{passwordError}</p>}
          {passwordMsg && <p className="text-sm text-accent">{passwordMsg}</p>}

          <button
            type="submit"
            disabled={passwordSaving}
            className="rounded-md bg-ink text-white text-sm font-medium px-4 py-2.5 hover:bg-black transition-colors disabled:opacity-50"
          >
            {passwordSaving ? 'Menyimpan...' : 'Ganti Password'}
          </button>
        </form>
      </div>
    </main>
  );
}
