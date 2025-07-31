"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { useSession } from "@/lib/auth-client"
import { toast } from "react-hot-toast"

interface EmailVerificationGuardProps {
  children: React.ReactNode
}

export function EmailVerificationGuard({ children }: EmailVerificationGuardProps) {
  const { data: session, isPending } = useSession()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    // Skip check if still loading or on auth pages
    if (isPending || pathname.startsWith('/auth') || pathname === '/') {
      return
    }

    // If user is logged in but email not verified, redirect to verify page
    if (session?.user && !session.user.emailVerified) {
      toast.error("Please verify your email address to access the platform")
      router.push(`/auth/verify-email?email=${encodeURIComponent(session.user.email)}`)
      return
    }

    // If no session on protected route, redirect to signin
    if (!session?.user && pathname.startsWith('/dashboard')) {
      router.push('/auth/signin')
      return
    }
  }, [session, isPending, pathname, router])

  // Show loading while checking session
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A50000]"></div>
      </div>
    )
  }

  // If on protected route and user is not verified, don't render children
  if (
    pathname.startsWith('/dashboard') && 
    session?.user && 
    !session.user.emailVerified
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Email Verification Required</h2>
          <p className="text-muted-foreground">Redirecting to verification page...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}