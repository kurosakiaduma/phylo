// Auth API response types
export interface User {
  id: string
  email: string
  display_name: string | null
  avatar_url: string | null
  dob: string | null
  gender: string | null
  pronouns: string | null
  bio: string | null
  phone: string | null
  location: string | null
  created_at: string
  updated_at: string | null
}

export interface AuthResponse {
  message: string
  user?: User
}

export interface OTPRequestBody {
  email: string
  is_registration?: boolean
}

export interface OTPVerifyBody {
  email: string
  code: string
  display_name?: string // Optional for registration
}

// API helper
async function apiCall<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(endpoint, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for session management
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'An error occurred',
    }))
    throw new Error(error.detail || `HTTP ${response.status}`)
  }

  return response.json()
}

// Auth API functions
export const authApi = {
  /**
   * Request OTP code to be sent to email
   */
  async requestOTP(
    email: string,
    isRegistration = false,
  ): Promise<AuthResponse> {
    return apiCall<AuthResponse>('/api/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({
        email,
        is_registration: isRegistration,
      } as OTPRequestBody),
    })
  },

  /**
   * Verify OTP code and establish session
   */
  async verifyOTP(
    email: string,
    otpCode: string,
    displayName?: string,
  ): Promise<AuthResponse> {
    return apiCall<AuthResponse>('/api/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({
        email,
        code: otpCode,
        display_name: displayName,
      } as OTPVerifyBody),
    })
  },

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const user = await apiCall<User>('/api/auth/me', {
        method: 'GET',
      })
      return user
    } catch (error) {
      // Not authenticated
      return null
    }
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    await apiCall<{ message: string }>('/api/auth/logout', {
      method: 'POST',
    })
  },

  /**
   * Refresh session token
   */
  async refreshToken(): Promise<AuthResponse> {
    return apiCall<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
    })
  },
}
