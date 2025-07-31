"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSessionContext } from "@/components/auth/session-provider"

export default function Home() {
  const { session, isLoading } = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (session) {
        router.push("/dashboard")
      } else {
        router.push("/auth/signin")
      }
    }
  }, [session, isLoading, router])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading...</p>
      </div>
    </div>
  )
}
