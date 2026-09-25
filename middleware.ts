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
  // CASE 1: Request is on APP SUBDOMAIN (e.g. app.domain.com or app.localhost:3000)
  // ---------------------------------------------------------------------------
  if (isAppSubdomain) {
    // If visitor visits root path on app subdomain (https://app.domain.com/)
    // Automatically redirect them to login page
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    // All other app paths (/login, /dashboard/*, /checkout, /api/*, /auth/*)
    // are served directly on the app subdomain
    return NextResponse.next();
  }

  // ---------------------------------------------------------------------------
  // CASE 2: Request is on MAIN DOMAIN (e.g. domain.com or localhost:3000)
  // ---------------------------------------------------------------------------
  // If user accesses Web App routes (/login, /dashboard/*, /checkout) on the main domain,
  // NEVER allow it on the main domain! Automatically redirect them to the app subdomain.
  const isWebAppPath =
    pathname.startsWith("/login") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/checkout");

  if (isWebAppPath) {
    const targetUrl = `${protocol}://${appHost}${pathname}${search}`;
    return NextResponse.redirect(targetUrl, 307);
  }

  // Otherwise, serve the Landing Page on the main domain
  return NextResponse.next();
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
