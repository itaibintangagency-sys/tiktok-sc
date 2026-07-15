'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

export default function ResetPasswordPage() {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Supabase otomatis membaca token pemulihan dari URL (#access_token=...)
    // dan membuat sesi sementara. Kita tunggu event ini sebelum menampilkan form.
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setReady(true);
      }
    });

    // Fallback: kalau sesi sudah ada duluan saat halaman dimuat
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => {
      listener?.subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError('Gagal menyimpan password baru: ' + error.message);
      return;
    }

    setSuccess(true);
    setTimeout(() => {
      router.push('/dashboard');
      router.refresh();
    }, 1500);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">
            Creator Pulse
          </p>
          <h1 className="font-display text-3xl text-ink">Atur password baru</h1>
          <p className="text-muted text-sm mt-2">
            Masukkan password baru untuk akun Anda.
          </p>
        </div>

        {!ready && !success && (
          <p className="text-sm text-muted">Memverifikasi link reset password…</p>
        )}

        {ready && !success && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Password Baru
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="Minimal 6 karakter"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted mb-1.5">
                Konfirmasi Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
                placeholder="Ulangi password baru"
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-ink text-white text-sm font-medium py-2.5 hover:bg-black transition-colors disabled:opacity-50"
            >
              {loading ? 'Menyimpan…' : 'Simpan Password Baru'}
            </button>
          </form>
        )}

        {success && (
          <p className="text-sm text-accent bg-accentSoft border border-accent/20 rounded-md px-3 py-2">
            Password berhasil diubah. Mengalihkan ke dashboard…
          </p>
        )}
      </div>
    </main>
  );
}
