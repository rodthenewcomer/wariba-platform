import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { correlationIdFromHeaders, CORRELATION_ID_HEADER } from '@wariba/observability';
import { loadWebConfig } from './lib/config';

const PROTECTED_PREFIXES = [
  '/hub',
  '/comptes',
  '/trade',
  '/payouts',
  '/plus',
  '/control',
  '/checkout',
  '/bienvenue',
];

/**
 * Session refresh + protected-route redirect. Config is loaded lazily
 * inside the function (not at module scope) so this file can still be
 * imported by tests without a full environment being present.
 */
export async function middleware(request: NextRequest) {
  const correlationId = correlationIdFromHeaders(Object.fromEntries(request.headers.entries()));
  let response = NextResponse.next({ request });

  const webConfig = loadWebConfig();
  const supabase = createServerClient(webConfig.SUPABASE_URL, webConfig.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
