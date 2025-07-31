"use client"

import { SignInForm } from "@/components/auth/sign-in-form"
import Link from "next/link"

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">LHA Donate</h1>
          <p className="text-muted-foreground">Let&apos;s Help Association Dashboard</p>
        </div>

        <SignInForm />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Don&apos;t have an account? </span>
          <Link href="/auth/signup" className="text-primary hover:underline">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  )
}