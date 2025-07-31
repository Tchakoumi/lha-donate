"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Mail, CheckCircle, AlertCircle } from "lucide-react"
import { toast } from "react-hot-toast"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function VerifyEmailPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [verificationError, setVerificationError] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const email = searchParams.get('email')

  useEffect(() => {
    // Auto-verify if token exists
    if (token) {
      const verifyAndRedirect = async () => {
        setIsLoading(true)
        try {
          const result = await authClient.verifyEmail({
            query: { token }
          })

          if (result.error) {
            setVerificationError(result.error.message || "Failed to verify email")
            toast.error("Email verification failed")
          } else {
            toast.success("Email verified successfully!")
            // Immediate redirect - no timeout
            router.push("/auth/signin")
          }
        } catch (error: unknown) {
          setVerificationError(error instanceof Error ? error.message : "An unexpected error occurred")
          toast.error("Email verification failed")
        } finally {
          setIsLoading(false)
        }
      }

      verifyAndRedirect()
    }
  }, []) // Empty dependency array - only run once on mount

  const resendVerification = async () => {
    if (!email) {
      toast.error("No email address found")
      return
    }

    setIsLoading(true)
    try {
      // Resend verification email
      await authClient.sendVerificationEmail({ email })
      toast.success("Verification email sent! Please check your inbox.")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Failed to resend verification email")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">LHA Donate</h1>
          <p className="text-muted-foreground">Let&apos;s Help Association Dashboard</p>
        </div>

        <Card className="w-full max-w-lg mx-auto">
          <CardHeader className="space-y-1 text-center">
            {verificationError ? (
              <>
                <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
                  <AlertCircle className="h-6 w-6 text-red-600" />
                </div>
                <CardTitle className="text-2xl">Verification Failed</CardTitle>
                <CardDescription>
                  {verificationError}
                </CardDescription>
              </>
            ) : (
              <>
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <CardTitle className="text-2xl">Check Your Email</CardTitle>
                <CardDescription>
                  We&apos;ve sent a verification link to {email ? (
                    <span className="font-medium text-foreground">{email}</span>
                  ) : (
                    "your email address"
                  )}. Please click the link to verify your account.
                </CardDescription>
              </>
            )}
          </CardHeader>

          <CardContent className="space-y-4">
            {!verificationError && !token && (
              <div className="space-y-4">
                <div className="text-center text-sm text-muted-foreground">
                  Didn&apos;t receive the email? Check your spam folder or request a new one.
                </div>
                <Button
                  onClick={resendVerification}
                  disabled={isLoading || !email}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? "Sending..." : "Resend Verification Email"}
                </Button>
              </div>
            )}

            {verificationError && (
              <div className="space-y-4">
                <Button
                  onClick={resendVerification}
                  disabled={isLoading || !email}
                  className="w-full"
                  variant="outline"
                >
                  {isLoading ? "Sending..." : "Resend Verification Email"}
                </Button>
              </div>
            )}

            {isLoading && token && (
              <div className="text-center text-sm text-muted-foreground">
                Verifying your email...
              </div>
            )}

            <div className="text-center">
              <Link
                href="/auth/signin"
                className="text-sm text-primary hover:underline"
              >
                Back to Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}