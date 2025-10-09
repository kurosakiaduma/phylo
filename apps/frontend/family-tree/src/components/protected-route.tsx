'use client'

import { useEffect, ReactNode } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'

interface ProtectedRouteProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Protected route wrapper component
 * Redirects to /login if user is not authenticated
 */
export function ProtectedRoute({ children, fallback }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, checkAuth } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Store the attempted URL to redirect back after login
      sessionStorage.setItem('redirectAfterLogin', pathname)
      router.push('/login')
    }
  }, [isLoading, isAuthenticated, router, pathname])

  if (isLoading) {
    return (
      fallback || (
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-t-2 border-primary"></div>
        </div>
      )
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}

/**
 * HOC version for page components
 */
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute>
        <Component {...props} />
      </ProtectedRoute>
    )
  }
}
