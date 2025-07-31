import { NextResponse } from 'next/server'

export function addSecurityHeaders(response: NextResponse) {
  // Security headers for production
  if (process.env.NODE_ENV === 'production') {
    // Prevent clickjacking
    response.headers.set('X-Frame-Options', 'DENY')
    
    // Prevent MIME type sniffing
    response.headers.set('X-Content-Type-Options', 'nosniff')
    
    // XSS Protection
    response.headers.set('X-XSS-Protection', '1; mode=block')
    
    // Referrer Policy
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    
    // Content Security Policy
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Note: Consider stricter policy
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://donate.letshelp.ong",
        "frame-ancestors 'none'",
      ].join('; ')
    )
    
    // Strict Transport Security (HSTS)
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    )
    
    // Permissions Policy
    response.headers.set(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), interest-cohort=()'
    )
  }
  
  return response
}