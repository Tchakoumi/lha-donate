"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { LogOut, User } from "lucide-react"
import { toast } from "react-hot-toast"

import { useSessionContext } from "@/components/auth/session-provider"
import { signOut } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const { session, isLoading } = useSessionContext()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !session) {
      router.push("/auth/signin")
    }
  }, [session, isLoading, router])

  const handleSignOut = async () => {
    try {
      await signOut()
      toast.success("Signed out successfully")
      router.push("/auth/signin")
    } catch (error) {
      toast.error("Failed to sign out")
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">LHA Donate Dashboard</h1>
            <p className="text-muted-foreground">Let&apos;s Help Association</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="text-sm">{session.user.name}</span>
              <span className="text-xs text-muted-foreground">({session.user.role})</span>
            </div>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Welcome!</CardTitle>
              <CardDescription>
                You&apos;re successfully authenticated
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p><strong>Name:</strong> {session.user.name}</p>
                <p><strong>Email:</strong> {session.user.email}</p>
                <p><strong>Role:</strong> {session.user.role}</p>
                <p><strong>Status:</strong> {session.user.isActive ? "Active" : "Inactive"}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Campaigns</CardTitle>
              <CardDescription>
                Manage donation campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Donations</CardTitle>
              <CardDescription>
                Track and manage donations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}