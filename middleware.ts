import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Extracts apex domain (e.g. "example.com" from "app.example.com" or "www.example.com")
 */
function getApexDomain(hostname: string): string {
  const clean = hostname.replace(/^www\./, "");
  if (clean.startsWith("app.")) {
    return clean.slice(4);
  }
  if (clean.startsWith("dashboard.")) {
    return clean.slice(10);
  }
  return clean;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") || "";
  const origin = request.headers.get("origin") || "";
  // Strip port from hostname (e.g. "app.domain.com:3000" -> "app.domain.com")
  const hostname = host.split(":")[0].toLowerCase();
  const port = host.includes(":") ? `:${host.split(":")[1]}` : "";
  const protocol =
    request.headers.get("x-forwarded-proto") ||
    (hostname === "localhost" || hostname === "127.0.0.1" ? "http" : "https");

  const isAppSubdomain = hostname.startsWith("app.") || hostname.startsWith("dashboard.");
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  const apexDomain = getApexDomain(hostname);
  const appHost = `app.${apexDomain}${port}`;
  const mainHost = `${apexDomain}${port}`;

  // ---------------------------------------------------------------------------
  // CORS Headers Helper (Mengizinkan komunikasi antar subdomain & Next.js RSC)
  // ---------------------------------------------------------------------------
  const applyCorsHeaders = (res: NextResponse) => {
    // Izinkan origin domain utama dan semua subdomainnya
    if (origin) {
      res.headers.set("Access-Control-Allow-Origin", origin);
    } else {
      res.headers.set("Access-Control-Allow-Origin", "*");
    }
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    );
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, rsc, next-router-state-tree, next-url, next-router-prefetch, x-nextjs-data, x-secret"
    );
    return res;
  };

  // Preflight OPTIONS request handling
  if (request.method === "OPTIONS") {
    const preflight = new NextResponse(null, { status: 204 });
    return applyCorsHeaders(preflight);
  }

  // ---------------------------------------------------------------------------
  // CASE 1: Request is on APP SUBDOMAIN (e.g. app.domain.com or app.localhost:3000)
  // ---------------------------------------------------------------------------
  if (isAppSubdomain) {
    // If visitor visits root path on app subdomain (https://app.domain.com/)
    // Automatically redirect them to login page
    if (pathname === "/") {
      const res = NextResponse.redirect(new URL("/login", request.url));
      return applyCorsHeaders(res);
    }

    // All other app paths (/login, /dashboard/*, /checkout, /api/*, /auth/*)
    // are served directly on the app subdomain
    const res = NextResponse.next();
    return applyCorsHeaders(res);
  }

  // ---------------------------------------------------------------------------
  // CASE 2: Request is on MAIN DOMAIN (e.g. domain.com or localhost:3000)
  // ---------------------------------------------------------------------------
  // Rute aplikasi privat (/login, /dashboard/*) diarahkan ke subdomain app.
  // Rute publik (/ dan /checkout) DILAYANI LANGSUNG di domain utama
  // agar checkout sebagai sales funnel tidak mengalami cross-origin fetch / CORS preflight.
  const isPrivateAppPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/dashboard");

  if (isPrivateAppPath) {
    const targetUrl = `${protocol}://${appHost}${pathname}${search}`;
    const res = NextResponse.redirect(targetUrl, 307);
    return applyCorsHeaders(res);
  }

  // Melayani Landing Page dan Checkout di domain utama
  const res = NextResponse.next();
  return applyCorsHeaders(res);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, manifest.json, sw.js, sitemap.xml, robots.txt
     * - Static asset file extensions (svg, png, jpg, jpeg, gif, webp, etc.)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|manifest\\.json|sw\\.js|sitemap\\.xml|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
