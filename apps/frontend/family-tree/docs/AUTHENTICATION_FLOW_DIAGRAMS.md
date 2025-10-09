# Authentication Flow Diagrams

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌────────────────┐         ┌──────────────────┐                │
│  │  Landing Page  │────────>│  Auth Modals     │                │
│  │  (page.tsx)    │         │  - LoginModal    │                │
│  └────────────────┘         │  - RegisterModal │                │
│                              └──────────────────┘                │
│                                      │                            │
│                                      ▼                            │
│                              ┌──────────────────┐                │
│                              │   Auth Hooks     │                │
│                              │   (useAuth)      │                │
│                              └──────────────────┘                │
│                                      │                            │
│                                      ▼                            │
│                              ┌──────────────────┐                │
│                              │   Auth API       │                │
│                              │  (auth-api.ts)   │                │
│                              └──────────────────┘                │
│                                      │                            │
└──────────────────────────────────────┼────────────────────────────┘
                                       │ HTTP Request
                                       │ /api/v1/*
                                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BACKEND (FastAPI)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────┐              │
│  │  Auth Endpoints  │────────>│  Auth Service    │              │
│  │  /api/v1/auth/*  │         │  (OTP logic)     │              │
│  └──────────────────┘         └──────────────────┘              │
│                                      │                            │
│                                      ▼                            │
│                              ┌──────────────────┐                │
│                              │    Database      │                │
│                              │  (users, otps)   │                │
│                              └──────────────────┘                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Login Flow (Detailed)

```
┌─────────┐
│  USER   │
└────┬────┘
     │
     │ 1. Clicks "Sign In"
     ▼
┌─────────────────┐
│  Landing Page   │
│  (Sign In btn)  │
└────┬────────────┘
     │
     │ 2. Opens LoginModal
     ▼
┌─────────────────────────┐
│     LoginModal          │
│  ┌─────────────────┐    │
│  │ Email Input     │    │
│  │ [____________]  │    │  Step 1: Email
│  │                 │    │
│  │ [Send Code]     │◄───┼── User enters email
│  └─────────────────┘    │
└───────────┬─────────────┘
            │
            │ 3. Validates email format
            │
            ▼
     ┌──────────────┐
     │  Valid?      │
     └──┬───────┬───┘
        │ No    │ Yes
        ▼       ▼
   ┌────────┐  ┌─────────────────────────┐
   │ Toast  │  │  authApi.requestOTP()   │
   │ Error  │  │  POST /api/v1/auth/     │
   └────────┘  │       otp/request       │
               └───────────┬─────────────┘
                           │
                           │ 4. Backend sends email
                           │
                           ▼
               ┌─────────────────────┐
               │   Backend Response  │
               │   { success: true } │
               └───────────┬─────────┘
                           │
                           │ 5. Success toast
                           │
                           ▼
               ┌─────────────────────────┐
               │     LoginModal          │
               │  ┌─────────────────┐    │
               │  │ OTP Code Input  │    │  Step 2: Verification
               │  │ [_ _ _ _ _ _]   │    │
               │  │                 │    │
               │  │ [Verify & Sign  │◄───┼── User enters 6-digit
               │  │     In]         │    │      code
               │  │                 │    │
               │  │ [Back]          │    │
               │  └─────────────────┘    │
               └───────────┬─────────────┘
                           │
                           │ 6. User submits OTP
                           │
                           ▼
               ┌─────────────────────────┐
               │  authApi.verifyOTP()    │
               │  POST /api/v1/auth/     │
               │       otp/verify        │
               └───────────┬─────────────┘
                           │
                           │ 7. Backend validates
                           │    Sets JWT cookie
                           │
                           ▼
               ┌─────────────────────┐
               │   Backend Response  │
               │   { success: true } │
               │   Cookie: jwt=...   │
               └───────────┬─────────┘
                           │
                           │ 8. Fetch user profile
                           │
                           ▼
               ┌─────────────────────────┐
               │ authApi.getCurrentUser()│
               │ GET /api/v1/auth/me     │
               └───────────┬─────────────┘
                           │
                           │ 9. Update auth state
                           │
                           ▼
               ┌─────────────────────┐
               │  useAuth.setUser()  │
               │  (Zustand store)    │
               └───────────┬─────────┘
                           │
                           │ 10. Redirect
                           │
                           ▼
               ┌─────────────────────┐
               │   /trees Page       │
               │  (or saved location)│
               └─────────────────────┘
```

## Registration Flow

```
┌─────────┐
│  USER   │
└────┬────┘
     │
     │ 1. Clicks "Get Started"
     ▼
┌─────────────────┐
│  Landing Page   │
│ (Get Started)   │
└────┬────────────┘
     │
     │ 2. Opens RegisterModal
     ▼
┌─────────────────────────┐
│   RegisterModal         │
│  ┌─────────────────┐    │
│  │ Display Name    │    │
│  │ [____________]  │    │  Step 1: Registration
│  │                 │    │
│  │ Email           │    │
│  │ [____________]  │    │
│  │                 │    │
│  │ [Create Account]│◄───┼── User fills form
│  └─────────────────┘    │
└───────────┬─────────────┘
            │
            │ 3. Validates inputs
            │    - Name: 1-50 chars
            │    - Email: valid format
            │
            ▼
     ┌──────────────┐
     │  Valid?      │
     └──┬───────┬───┘
        │ No    │ Yes
        ▼       ▼
   ┌────────┐  ┌─────────────────────────┐
   │ Toast  │  │  authApi.requestOTP()   │
   │ Error  │  │  POST /api/v1/auth/     │
   └────────┘  │       otp/request       │
               │  { is_registration:     │
               │    true }               │
               └───────────┬─────────────┘
                           │
                           │ 4. Backend sends email
                           │    (registers user)
                           │
                           ▼
               ┌─────────────────────┐
               │   Backend Response  │
               │   { success: true } │
               └───────────┬─────────┘
                           │
                           │ 5. Success toast
                           │
                           ▼
               ┌─────────────────────────┐
               │   RegisterModal         │
               │  ┌─────────────────┐    │
               │  │ OTP Code Input  │    │  Step 2: Verification
               │  │ [_ _ _ _ _ _]   │    │
               │  │                 │    │
               │  │ [Verify &       │◄───┼── User enters code
               │  │  Continue]      │    │
               │  │                 │    │
               │  │ [Back]          │    │
               │  └─────────────────┘    │
               └───────────┬─────────────┘
                           │
                           │ 6. User submits OTP
                           │
                           ▼
               ┌─────────────────────────┐
               │  authApi.verifyOTP()    │
               │  POST /api/v1/auth/     │
               │       otp/verify        │
               └───────────┬─────────────┘
                           │
                           │ 7. Backend validates
                           │    Creates account
                           │    Sets JWT cookie
                           │
                           ▼
               ┌─────────────────────┐
               │   Backend Response  │
               │   { success: true } │
               │   Cookie: jwt=...   │
               └───────────┬─────────┘
                           │
                           │ 8. Fetch user profile
                           │
                           ▼
               ┌─────────────────────────┐
               │ authApi.getCurrentUser()│
               │ GET /api/v1/auth/me     │
               └───────────┬─────────────┘
                           │
                           │ 9. Update auth state
                           │
                           ▼
               ┌─────────────────────┐
               │  useAuth.setUser()  │
               │  (Zustand store)    │
               └───────────┬─────────┘
                           │
                           │ 10. Redirect to onboarding
                           │
                           ▼
               ┌─────────────────────┐
               │  /onboarding Page   │
               │  (new user setup)   │
               └─────────────────────┘
```

## Protected Route Flow

```
┌─────────┐
│  USER   │
└────┬────┘
     │
     │ 1. Navigates to protected page
     │    (e.g., /trees, /dashboard)
     ▼
┌─────────────────────────┐
│   ProtectedRoute        │
│   Component             │
└───────────┬─────────────┘
            │
            │ 2. Check auth state
            │
            ▼
     ┌──────────────────┐
     │ useAuth.checkAuth()│
     │   (on mount)     │
     └───────┬──────────┘
             │
             │ 3. Verify session
             │
             ▼
   ┌─────────────────────────┐
   │ authApi.getCurrentUser()│
   │ GET /api/v1/auth/me     │
   └───────┬─────────────────┘
           │
           ▼
    ┌──────────────┐
    │ Authenticated?│
    └──┬───────┬───┘
       │ No    │ Yes
       ▼       ▼
 ┌────────────┐ ┌─────────────┐
 │  Redirect  │ │   Render    │
 │  to /login │ │   Protected │
 │  with      │ │   Content   │
 │  returnUrl │ └─────────────┘
 └────────────┘
       │
       │ 4. Save intended URL
       │
       ▼
 ┌────────────────┐
 │  /login Page   │
 │  (with return  │
 │   parameter)   │
 └────┬───────────┘
      │
      │ 5. After successful login
      │
      ▼
 ┌────────────────┐
 │  Redirect back │
 │  to original   │
 │  page          │
 └────────────────┘
```

## State Management (Zustand)

```
┌────────────────────────────────────────────────────────────┐
│                    Auth Store (Zustand)                     │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  State:                                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ user: User | null                                    │   │
│  │ isAuthenticated: boolean                             │   │
│  │ isLoading: boolean                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Actions:                                                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ setUser(user: User | null)                          │   │
│  │ checkAuth(): Promise<void>                          │   │
│  │ logout(): Promise<void>                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Persistence:                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ • Saves to localStorage                             │   │
│  │ • Key: 'auth-storage'                               │   │
│  │ • Rehydrates on page load                           │   │
│  │ • Excludes isLoading from storage                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└────────────────────────────────────────────────────────────┘
              │                            │
              │ Read                       │ Write
              ▼                            ▼
    ┌──────────────────┐        ┌──────────────────┐
    │  Components      │        │  Auth Actions    │
    │  - LoginModal    │        │  - setUser()     │
    │  - RegisterModal │        │  - checkAuth()   │
    │  - ProtectedRoute│        │  - logout()      │
    │  - Navigation    │        └──────────────────┘
    └──────────────────┘
```

## Error Handling Flow

```
┌─────────────────────┐
│   API Request       │
│   (any auth action) │
└──────────┬──────────┘
           │
           ▼
    ┌──────────────┐
    │   Try-Catch  │
    └──┬───────┬───┘
       │       │
    Success   Error
       │       │
       ▼       ▼
┌──────────┐  ┌──────────────────────────┐
│  Return  │  │  Check Response Status   │
│  Data    │  └──────────┬───────────────┘
└──────────┘             │
                         ▼
              ┌──────────────────────┐
              │  Status Code         │
              └─┬────────┬───────┬───┘
                │        │       │
              400/     401     500
              422    Unauthorized Server
                │        │       │
                ▼        ▼       ▼
         ┌──────────┐ ┌────────┐ ┌────────┐
         │  Toast   │ │ Logout │ │ Toast  │
         │  Error   │ │ + Redir│ │ Generic│
         │  Message │ │ /login │ │ Error  │
         └──────────┘ └────────┘ └────────┘
```

## Session Lifecycle

```
┌────────────────────────────────────────────────────────────┐
│                    Session Timeline                         │
└────────────────────────────────────────────────────────────┘

User Login
    │
    │ JWT Cookie Set
    │ (httpOnly, secure)
    ▼
┌─────────────────────────────────────────────────────────┐
│  Active Session                                          │
│  • User state in Zustand                                 │
│  • JWT in cookie                                         │
│  • Persisted to localStorage                             │
└─────────────────────────────────────────────────────────┘
    │
    │ Time passes...
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  Token Expiration (Future Implementation)                │
│  • Backend returns 401                                   │
│  • Frontend tries refreshToken()                         │
│  • If refresh fails, logout + redirect                   │
└─────────────────────────────────────────────────────────┘
    │
    │ OR User clicks "Logout"
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  Logout Flow                                             │
│  1. Call authApi.logout()                                │
│  2. Backend clears JWT cookie                            │
│  3. Clear Zustand state                                  │
│  4. Clear localStorage                                   │
│  5. Redirect to landing page                             │
└─────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
┌──────────────────────────────────────────────────────────┐
│                    Root Layout                            │
│                   (app/layout.tsx)                        │
│  ┌────────────────────────────────────────────────────┐  │
│  │  ThemeProvider (dark mode)                         │  │
│  │  Toaster (toast notifications)                     │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
        ┌──────────────────────────────────────┐
        │         Page Components              │
        └──────────┬──────────────┬────────────┘
                   │              │
                   ▼              ▼
         ┌─────────────────┐  ┌──────────────────┐
         │  Public Pages   │  │  Protected Pages │
         ├─────────────────┤  ├──────────────────┤
         │ • Landing (/)   │  │ • /trees         │
         │ • /login        │  │ • /dashboard     │
         │ • /about        │  │ • /members       │
         └─────────────────┘  └──────────────────┘
                   │                    │
                   │                    ▼
                   │          ┌──────────────────┐
                   │          │ ProtectedRoute   │
                   │          │   wrapper        │
                   │          └──────────────────┘
                   │                    │
                   ▼                    ▼
         ┌─────────────────┐  ┌──────────────────┐
         │  Auth Modals    │  │   useAuth hook   │
         ├─────────────────┤  │   (Zustand)      │
         │ • LoginModal    │──┤                  │
         │ • RegisterModal │  │                  │
         └─────────────────┘  └──────────────────┘
```

---

**Note:** All diagrams reflect the current implementation as of Phase 3.3. Future phases may introduce additional flows (password reset, social login, etc.).
