"use client"

import { useSession } from "@/lib/auth-client"
import { createContext, useContext, ReactNode } from "react"

type Session = any // Simplified for now

type SessionContextType = {
  session: Session
  isLoading: boolean
}

const SessionContext = createContext<SessionContextType | undefined>(undefined)

export function SessionProvider({ children }: { children: ReactNode }) {
  const { data: session, isPending: isLoading } = useSession()

  return (
    <SessionContext.Provider value={{ session, isLoading }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSessionContext() {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error("useSessionContext must be used within a SessionProvider")
  }
  return context
}