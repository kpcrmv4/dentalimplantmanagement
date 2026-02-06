import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const getRoleHomePage = (role: string) => {
  if (role === 'dentist') return '/dentist-dashboard';
  if (role === 'assistant') return '/assistant-dashboard';
  return '/dashboard';
};

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes - require authentication
  const protectedPaths = [
    '/dashboard',
    '/dentist-dashboard',
    '/assistant-dashboard',
    '/cases',
    '/patients',
    '/inventory',
    '/reservations',
    '/orders',
    '/exchanges',
    '/reports',
    '/settings',
    '/audit-logs',
    '/profile',
  ];

  const isProtectedPath = protectedPaths.some(path =>
    pathname.startsWith(path)
  );

  // If accessing protected route without auth, redirect to login
  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // For authenticated users, fetch role ONCE for all checks below
  if (user) {
    const needsRoleCheck =
      pathname === '/login' ||
      pathname.startsWith('/audit-logs') ||
      pathname.startsWith('/settings') ||
      pathname.startsWith('/orders') ||
      pathname.startsWith('/exchanges') ||
      pathname.startsWith('/dentist-dashboard') ||
      pathname.startsWith('/assistant-dashboard') ||
      pathname.startsWith('/dashboard') ||
      pathname.startsWith('/inventory') ||
      pathname.startsWith('/reservations') ||
      pathname.startsWith('/reports');

    if (needsRoleCheck) {
      // Single DB query for all role-based checks
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role;
      const homePage = getRoleHomePage(role || 'admin');

      // Logged-in user visiting /login → redirect to their home
      if (pathname === '/login') {
        return NextResponse.redirect(new URL(homePage, request.url));
      }

      // Admin-only routes
      if ((pathname.startsWith('/audit-logs') || pathname.startsWith('/settings/users') || pathname.startsWith('/reports')) && role !== 'admin') {
        return NextResponse.redirect(new URL(`${homePage}?error=unauthorized`, request.url));
      }

      // Admin and stock_staff only
      if ((pathname.startsWith('/orders') || pathname.startsWith('/exchanges') || pathname.startsWith('/inventory')) && !['admin', 'stock_staff'].includes(role || '')) {
        return NextResponse.redirect(new URL(`${homePage}?error=unauthorized`, request.url));
      }

      // Reservations - not for dentist
      if (pathname.startsWith('/reservations') && role === 'dentist') {
        return NextResponse.redirect(new URL(`${homePage}?error=unauthorized`, request.url));
      }

      // Dashboard (main) - not for dentist or assistant
      if (pathname === '/dashboard' && (role === 'dentist' || role === 'assistant')) {
        return NextResponse.redirect(new URL(homePage, request.url));
      }

      // Dentist-only routes
      if (pathname.startsWith('/dentist-dashboard') && role !== 'dentist') {
        return NextResponse.redirect(new URL(`${homePage}?error=unauthorized`, request.url));
      }

      // Assistant-only routes
      if (pathname.startsWith('/assistant-dashboard') && role !== 'assistant') {
        return NextResponse.redirect(new URL(`${homePage}?error=unauthorized`, request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
