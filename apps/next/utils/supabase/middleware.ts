import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  const isPlaceholderSupabase =
    !supabaseUrl ||
    !supabaseAnonKey ||
    supabaseUrl.includes('placeholder.supabase.co');
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes('-auth-token'));

  if (isPlaceholderSupabase || !hasAuthCookie) {
    if (request.nextUrl.pathname.startsWith('/admin')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('debug_reason', 'no_user');
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });

          const host = request.nextUrl.hostname;
          const isSunShadeDomain = host === 'sunshade.icu' || host.endsWith('.sunshade.icu');

          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              path: '/',
              sameSite: 'lax',
              secure: true,
              ...(isSunShadeDomain && { domain: '.sunshade.icu' }),
            })
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('debug_reason', 'no_user');
      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'admin') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      url.searchParams.set('debug_reason', 'not_admin');
      url.searchParams.set('debug_role', profile?.role || 'null');
      url.searchParams.set('debug_error', error?.message || 'none');
      const redirectResponse = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie);
      });
      return redirectResponse;
    }
  }

  return supabaseResponse;
}
