'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setLoading(false);
      setError('Email atau password salah. Coba lagi.');
      return;
    }

    // Cek role untuk tentukan halaman tujuan setelah login
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    setLoading(false);

    const destination =
      profile?.role === 'super_admin' ? '/dashboard/campaigns' : '/dashboard/my-batches';

    router.push(destination);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="mb-10">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-mono text-xs tracking-widest uppercase text-accent">
              Creator Pulse
            </span>
          </div>
          <h1 className="font-display text-3xl text-ink">Masuk ke dashboard</h1>
          <p className="text-muted text-sm mt-2">
            Pantau performa video kerjasama creator TikTok.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              placeholder="nama@perusahaan.com"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-colors"
              placeholder="••••••••"
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
            {loading ? 'Memproses…' : 'Masuk'}
          </button>
        </form>

        <p className="text-xs text-muted mt-6">
          Belum punya akun? Hubungi Super Admin tim untuk dibuatkan akun — pendaftaran
          mandiri sudah ditutup.
        </p>
      </div>
    </main>
  );
}
