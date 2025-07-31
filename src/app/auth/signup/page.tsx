"use client"

import { SignUpForm } from "@/components/auth/sign-up-form"
import Link from "next/link"

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">LHA Donate</h1>
          <p className="text-muted-foreground">Let&apos;s Help Association Dashboard</p>
        </div>

        <SignUpForm />

        <div className="text-center text-sm">
          <span className="text-muted-foreground">Already have an account? </span>
          <Link href="/auth/signin" className="text-primary hover:underline">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}