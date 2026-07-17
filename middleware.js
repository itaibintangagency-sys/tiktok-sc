import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

// Path yang cuma boleh diakses super_admin — admin otomatis di-redirect
const SUPER_ADMIN_ONLY_PREFIXES = ['/dashboard/campaigns', '/dashboard/team'];

export async function middleware(request) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const isDashboard = request.nextUrl.pathname.startsWith('/dashboard');
  const isLogin = request.nextUrl.pathname.startsWith('/login');

  if (isDashboard && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Ambil role user (cuma kalau perlu — user sudah login dan menuju /dashboard atau /login)
  let role = null;
  if (user && (isDashboard || isLogin)) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();
    role = profile?.role || 'admin';
  }

  const homePath = role === 'super_admin' ? '/dashboard/campaigns' : '/dashboard/my-batches';

  if (isLogin && user) {
    return NextResponse.redirect(new URL(homePath, request.url));
  }

  // Admin dilarang masuk ke area khusus super_admin
  if (isDashboard && role === 'admin') {
    const isRestricted = SUPER_ADMIN_ONLY_PREFIXES.some((p) =>
      request.nextUrl.pathname.startsWith(p)
    );
    if (isRestricted) {
      return NextResponse.redirect(new URL('/dashboard/my-batches', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
};
