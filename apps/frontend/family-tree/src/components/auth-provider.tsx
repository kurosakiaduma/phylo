'use client'

import { useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'

/**
 * AuthProvider Component
 *
 * Initializes authentication state by checking the session
 * on app mount. This verifies that the JWT cookie is still valid
 * and syncs with the server.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { checkAuth, user, isAuthenticated } = useAuth()

  useEffect(() => {
    // Check auth status on mount
    console.log('[AuthProvider] Checking authentication...')
    checkAuth()
  }, [checkAuth])

  // Log auth state changes separately
  useEffect(() => {
    console.log('[AuthProvider] Auth state updated:', {
      isAuthenticated,
      userEmail: user?.email,
    })
  }, [isAuthenticated, user])

  return <>{children}</>
}
