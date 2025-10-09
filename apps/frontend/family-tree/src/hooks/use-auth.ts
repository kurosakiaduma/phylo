'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authApi, type User } from '@/lib/auth-api'

interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  checkAuth: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,

      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),

      setLoading: (loading) => set({ isLoading: loading }),

      checkAuth: async () => {
        set({ isLoading: true })
        console.log('[useAuth] Starting auth check...')
        try {
          const user = await authApi.getCurrentUser()
          console.log(
            '[useAuth] Auth check result:',
            user ? `User: ${user.email}` : 'No user (not authenticated)',
          )
          set({
            user,
            isAuthenticated: !!user,
            isLoading: false,
          })
        } catch (error) {
          console.error('[useAuth] Auth check error:', error)
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },

      logout: async () => {
        try {
          await authApi.logout()
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
        } catch (error) {
          console.error('Logout failed:', error)
          // Still clear local state
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)

/**
 * Custom hook for authentication
 * Provides user state, loading state, and auth actions
 */
export function useAuth() {
  const { user, isLoading, isAuthenticated, setUser, checkAuth, logout } =
    useAuthStore()

  return {
    user,
    isLoading,
    isAuthenticated,
    setUser,
    checkAuth,
    logout,
  }
}
