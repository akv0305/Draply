import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Next.js middleware — runs on every request that matches `config.matcher`.
 *
 * Responsibilities:
 *   1. Refresh the Supabase session cookie (keeps sessions alive).
 *   2. Redirect unauthenticated users away from protected routes.
 *
 * Role-level checks (MERCHANT vs ADMIN vs CUSTOMER) are intentionally
 * deferred to each route group's layout.tsx via requireRole(), so this
 * file stays thin and fast.
 */
export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Write to the request (for SSR) and the response (for the browser).
          req.cookies.set(name, value);
          res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
        },
        remove(name: string, options: CookieOptions) {
          req.cookies.set(name, "");
          res.cookies.set(name, "", options as Parameters<typeof res.cookies.set>[2]);
        },
      },
    }
  );

  // getUser() refreshes the session cookie if it's near expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = req.nextUrl.pathname;

  // Routes that require a logged-in session (any role).
  const isProtected =
    path.startsWith("/merchant") ||
    path.startsWith("/admin") ||
    path.startsWith("/account") ||
    path.startsWith("/orders") ||
    path.startsWith("/checkout");

  // Allow logged-in users to proceed; redirect others to /login.
  if (isProtected && !user) {
    const loginUrl = req.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", path);
    return NextResponse.redirect(loginUrl);
  }

  // Already logged in → don't show /login page again.
  if (path === "/login" && user) {
    const homeUrl = req.nextUrl.clone();
    homeUrl.pathname = "/";
    return NextResponse.redirect(homeUrl);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static  (static assets)
     *   - _next/image   (image optimisation)
     *   - favicon.ico
     *   - /images/*     (public images)
     *   - /api/public/* (unauthenticated API routes, if any)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|images|api/public).*)",
  ],
};
