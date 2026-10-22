/**
 * Vidnoria Next.js Middleware
 *
 * Handles locale detection and routing:
 * 1. Checks URL for /tr/, /en/, /ar/ prefix
 * 2. If no locale prefix, detects from Accept-Language header
 * 3. Redirects to appropriate locale prefix
 * 4. Defaults to 'tr' if no match
 * 5. Skips API routes, admin, _next, and static files
 */

import { NextRequest, NextResponse } from 'next/server';
import { locales, defaultLocale, type Locale } from './lib/i18n';

// ─── Path Patterns to Skip ──────────────────────────────────────────────────────

/** Paths that should NOT be processed by the locale middleware */
const IGNORED_PATHS = [
  '/api',        // API routes
  '/_next',      // Next.js internals
  '/admin',      // Admin panel (has its own routing)
  '/favicon.ico',
  '/robots.txt',
  '/sitemap.xml',
  '/manifest.json',
];

/** File extensions that should be served as-is */
const STATIC_FILE_EXTENSIONS = [
  '.ico', '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp',
  '.css', '.js', '.map', '.woff', '.woff2', '.ttf', '.eot',
  '.mp4', '.webm', '.mp3', '.m4a', '.ogg',
  '.xml', '.json', '.txt',
];

// ─── Helper Functions ───────────────────────────────────────────────────────────

/**
 * Check if the request path should be ignored by the middleware
 */
function shouldIgnorePath(pathname: string): boolean {
  // Check ignored path prefixes
  if (IGNORED_PATHS.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }

  // Check static file extensions
  if (STATIC_FILE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return true;
  }

  return false;
}

/**
 * Extract the locale prefix from a pathname.
 * Returns the locale if found, undefined otherwise.
 *
 * @example
 * getLocaleFromPath('/en/blog') // 'en'
 * getLocaleFromPath('/about')    // undefined
 */
function getLocaleFromPath(pathname: string): Locale | undefined {
  const segments = pathname.split('/');
  const firstSegment = segments[1]; // segments[0] is '' (before the leading /)

  if (firstSegment && locales.includes(firstSegment as Locale)) {
    return firstSegment as Locale;
  }

  return undefined;
}

/**
 * Detect the preferred locale from the Accept-Language header.
 * Parses the header and finds the best matching supported locale.
 *
 * @example
 * // Accept-Language: en-US,en;q=0.9,tr;q=0.8
 * detectLocaleFromHeader(header) // 'en'
 */
function detectLocaleFromHeader(acceptLanguage: string | null): Locale {
  if (!acceptLanguage) {
    return defaultLocale;
  }

  // Parse Accept-Language header into sorted list of language preferences
  const languages = acceptLanguage
    .split(',')
    .map((lang) => {
      const [code, qualityStr] = lang.trim().split(';q=');
      const quality = qualityStr ? parseFloat(qualityStr) : 1.0;
      return { code: code.trim().toLowerCase(), quality };
    })
    .sort((a, b) => b.quality - a.quality);

  // Find the first matching supported locale
  for (const { code } of languages) {
    // Exact match (e.g., 'tr', 'en', 'ar')
    const exactMatch = locales.find((locale) => locale === code);
    if (exactMatch) {
      return exactMatch;
    }

    // Partial match (e.g., 'en-US' → 'en', 'ar-SA' → 'ar')
    const languagePrefix = code.split('-')[0];
    const partialMatch = locales.find((locale) => locale === languagePrefix);
    if (partialMatch) {
      return partialMatch;
    }
  }

  return defaultLocale;
}

// ─── Middleware ──────────────────────────────────────────────────────────────────

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for ignored paths and static files
  if (shouldIgnorePath(pathname)) {
    return NextResponse.next();
  }

  // Check if the URL already has a locale prefix
  const existingLocale = getLocaleFromPath(pathname);

  if (existingLocale) {
    // URL already has a valid locale prefix - proceed normally
    return NextResponse.next();
  }

  // No locale prefix found - detect locale and redirect
  const acceptLanguage = request.headers.get('accept-language');
  const detectedLocale = detectLocaleFromHeader(acceptLanguage);

  // Build the new URL with the locale prefix
  const newUrl = request.nextUrl.clone();
  newUrl.pathname = `/${detectedLocale}${pathname}`;

  // Use 307 (Temporary Redirect) so the browser doesn't cache the redirect
  // This allows users to change their language preference
  return NextResponse.redirect(newUrl, 307);
}

export const middleware = proxy;
export default proxy;

export const config = {
  /*
   * Match all request paths except:
   * - api (API routes)
   * - _next (Next.js internals)
   * - Static files with known extensions
   */
  matcher: [
    '/((?!api|_next/static|_next/image|admin|favicon.ico|robots.txt|sitemap.xml|manifest.json|.*\\..*).*)',
  ],
};
