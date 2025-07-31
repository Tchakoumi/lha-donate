import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authRateLimiter, generalRateLimiter } from '@/lib/rate-limiter'
import { addSecurityHeaders } from '@/lib/security-headers'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply rate limiting to auth routes
  if (pathname.startsWith('/api/auth/') && (pathname.includes('sign-in') || pathname.includes('sign-up'))) {
    const { isLimited, remainingRequests, resetTime } = authRateLimiter(request)
    
    if (isLimited) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Too many authentication attempts. Please try again later.',
          retryAfter: Math.ceil((resetTime - Date.now()) / 1000)
        }),
        { 
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetTime).toISOString(),
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
          }
        }
      )
    }
  }

  // Apply general rate limiting to auth pages
  if (pathname.startsWith('/auth/')) {
    const { isLimited, remainingRequests, resetTime } = generalRateLimiter(request)
    
    if (isLimited) {
      return new NextResponse('Too Many Requests', { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': '0', 
          'X-RateLimit-Reset': new Date(resetTime).toISOString(),
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString()
        }
      })
    }
  }

  // Skip middleware for static files, API routes (except auth), and public routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/auth') ||
    pathname === '/' ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // For protected routes like /dashboard, check session cookie existence
  // Note: Full session validation moved to client-side due to Edge Runtime limitations
  if (pathname.startsWith('/dashboard')) {
    const sessionCookie = request.cookies.get('better-auth.session_token')
    
    if (!sessionCookie?.value) {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
    
    // Let client-side handle full session validation
    const response = NextResponse.next()
    return addSecurityHeaders(response)
  }

  // Apply security headers to all responses
  const response = NextResponse.next()
  return addSecurityHeaders(response)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}