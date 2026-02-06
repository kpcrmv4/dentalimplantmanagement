import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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
    request.nextUrl.pathname.startsWith(path)
  );

  // If accessing protected route without auth, redirect to login
  if (isProtectedPath && !user) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If logged in and trying to access login page, redirect to dashboard
  if (user && request.nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Admin-only routes
  const adminOnlyPaths = ['/audit-logs', '/settings/users'];
  const isAdminOnlyPath = adminOnlyPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAdminOnlyPath && user) {
    // Check user role from database
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
    }
  }

  // Orders routes - admin and stock_staff only
  const ordersOnlyPaths = ['/orders'];
  const isOrdersOnlyPath = ordersOnlyPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isOrdersOnlyPath && user) {
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['admin', 'stock_staff'].includes(profile.role)) {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
    }
  }

  // Dentist-only routes
  const dentistOnlyPaths = ['/dentist-dashboard'];
  const isDentistOnlyPath = dentistOnlyPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isDentistOnlyPath && user) {
    // Check user role from database
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'dentist') {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
    }
  }

  // Assistant-only routes
  const assistantOnlyPaths = ['/assistant-dashboard'];
  const isAssistantOnlyPath = assistantOnlyPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  );

  if (isAssistantOnlyPath && user) {
    // Check user role from database
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'assistant') {
      return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes that don't need auth
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
