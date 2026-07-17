'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';

const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin' };

export default function AccountBar({ userName, userEmail, userRole }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  const displayName = userName?.trim() || userEmail || 'Akun';
  const roleLabel = ROLE_LABEL[userRole] || 'Admin';

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/dashboard/profile"
        className="text-xs text-muted hover:text-ink hidden sm:inline"
        title={userEmail}
      >
        {displayName} <span className="text-muted/60">· {roleLabel}</span>
      </Link>
      <button
        onClick={handleLogout}
        className="text-xs font-medium text-muted hover:text-ink border border-line rounded-md px-3 py-1.5 transition-colors"
      >
        Keluar
      </button>
    </div>
  );
}
