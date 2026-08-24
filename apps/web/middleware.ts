import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { correlationIdFromHeaders, CORRELATION_ID_HEADER } from '@wariba/observability/correlation';
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
  /*
   * `/support/` with the trailing slash, and the slash is load-bearing.
   *
   * `/support` itself is a canonical *public* route (Constitution §6) and
   * stays reachable to a visitor — its layout serves the marketing explainer
   * to anyone without a session. Everything below it is a trader's own record:
   * a request, a thread, a contestation. Writing `/support` here would have
   * sent an anonymous visitor to /login from a page the Constitution says is
   * public; writing `/support/` protects exactly the sub-tree.
   */
  '/support/',
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
    // The configured application URL is authoritative. Building an absolute
    // redirect from request.url would trust an attacker-controlled Host header.
    const loginUrl = new URL('/login', webConfig.APP_BASE_URL);
    loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  response.headers.set(CORRELATION_ID_HEADER, correlationId);
  return response;
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
