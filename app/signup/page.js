import Link from 'next/link';

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <p className="font-mono text-xs tracking-widest uppercase text-accent mb-1">
          Creator Pulse
        </p>
        <h1 className="font-display text-3xl text-ink mb-3">Pendaftaran tertutup</h1>
        <p className="text-muted text-sm leading-relaxed mb-6">
          Akun untuk dashboard ini dibuat langsung oleh Super Admin tim, bukan lewat
          pendaftaran mandiri. Hubungi Super Admin kalau Anda perlu akses.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-md bg-ink text-white text-sm font-medium px-5 py-2.5 hover:bg-black transition-colors"
        >
          Kembali ke halaman login
        </Link>
      </div>
    </main>
  );
}
