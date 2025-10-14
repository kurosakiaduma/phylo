'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Loader2, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { authApi } from '@/lib/auth-api'

interface AuthModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  inviteEmail?: string // Pre-fill email for invite flow
  mode?: 'login' | 'register' | 'auto' // auto = check if user exists
}

export function AuthModal({
  open,
  onOpenChange,
  inviteEmail,
  mode = 'auto',
}: AuthModalProps) {
  const [email, setEmail] = useState(inviteEmail || '')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [authMode, setAuthMode] = useState<'login' | 'register' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [checkingUser, setCheckingUser] = useState(false)
  const { toast } = useToast()
  const { setUser } = useAuth()
  const router = useRouter()

  // Pre-fill email when inviteEmail changes
  useEffect(() => {
    if (inviteEmail) {
      setEmail(inviteEmail)
    }
  }, [inviteEmail])

  // Check if user exists when email is provided and mode is auto
  const checkUserExists = async (emailToCheck: string) => {
    if (mode !== 'auto' || !emailToCheck) return

    setCheckingUser(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/check-email`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: emailToCheck }),
        },
      )

      if (response.ok) {
        const data = await response.json()
        setAuthMode(data.exists ? 'login' : 'register')
      }
    } catch (error) {
      // Default to login if check fails
      setAuthMode('login')
    } finally {
      setCheckingUser(false)
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      })
      return
    }

    // For auto mode, check if user exists first
    if (mode === 'auto' && !authMode) {
      await checkUserExists(email)
      return
    }

    setIsLoading(true)
    try {
      const isRegistration = mode === 'register' || authMode === 'register'
      await authApi.requestOTP(email, isRegistration)

      toast({
        title: 'Code Sent! 📧',
        description: 'Check your email for the verification code.',
      })
      setStep('otp')
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to send code',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!otpCode || otpCode.length !== 6) {
      toast({
        title: 'Invalid Code',
        description: 'Please enter the 6-digit code.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await authApi.verifyOTP(email, otpCode)
      if (response.user) {
        setUser(response.user)

        const isNewUser = authMode === 'register'
        toast({
          title: isNewUser ? 'Welcome to Phylo! 🌳' : 'Welcome back! 👋',
          description: `${
            isNewUser ? 'Account created and signed in' : 'Signed in'
          } as ${response.user.email}`,
        })

        onOpenChange(false)

        // Redirect to saved location or trees page
        const redirectTo =
          sessionStorage.getItem('redirectAfterLogin') || '/trees'
        sessionStorage.removeItem('redirectAfterLogin')
        router.push(redirectTo)
      }
    } catch (error) {
      toast({
        title: 'Verification Failed',
        description:
          error instanceof Error ? error.message : 'Invalid or expired code',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (step === 'otp') {
      setStep('email')
      setOtpCode('')
    } else if (authMode && mode === 'auto') {
      setAuthMode(null)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after animation
    setTimeout(() => {
      setStep('email')
      setEmail(inviteEmail || '')
      setOtpCode('')
      setAuthMode(null)
    }, 200)
  }

  const getTitle = () => {
    if (step === 'otp') return 'Enter Code'
    if (mode === 'login') return 'Welcome Back'
    if (mode === 'register') return 'Create Account'
    if (authMode === 'login') return 'Welcome Back'
    if (authMode === 'register') return 'Create Account'
    return 'Sign In or Create Account'
  }

  const getDescription = () => {
    if (step === 'otp') return `We sent a verification code to ${email}`
    if (mode === 'login') return 'Sign in to your Phylo account to continue.'
    if (mode === 'register') return 'Create your Phylo account to get started.'
    if (authMode === 'login') return 'Welcome back! Sign in to continue.'
    if (authMode === 'register')
      return "We&apos;ll create your account and send a verification code."
    return 'Enter your email to sign in or create an account.'
  }

  const getButtonText = () => {
    if (isLoading) {
      if (step === 'otp') return 'Verifying...'
      if (checkingUser) return 'Checking...'
      return 'Sending Code...'
    }

    if (step === 'otp') return 'Verify & Continue'
    if (mode === 'login' || authMode === 'login') return 'Send Sign In Code'
    if (mode === 'register' || authMode === 'register')
      return 'Create Account & Send Code'
    if (mode === 'auto' && !authMode) return 'Continue'
    return 'Send Verification Code'
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="backdrop-blur-md sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{getTitle()}</DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={isLoading || checkingUser || !!inviteEmail}
                  required
                />
              </div>
              {inviteEmail && (
                <p className="text-xs text-muted-foreground">
                  This email is pre-filled from your invitation
                </p>
              )}
            </div>

            {/* Show user status for auto mode */}
            {mode === 'auto' && authMode && (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm">
                  {authMode === 'login' ? (
                    <>✓ Account found. We&apos;ll send you a sign-in code.</>
                  ) : (
                    <>
                      🆕 New user. We&apos;ll create your account and send a
                      verification code.
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="flex gap-2">
              {(authMode === 'login' || authMode === 'register' || step === 'otp') && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading || checkingUser}
                  className="w-full"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading || checkingUser}
              >
                {(isLoading || checkingUser) && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {getButtonText()}
              </Button>
            </div>

            {mode === 'auto' && !authMode && (
              <p className="text-center text-sm text-muted-foreground">
                We&apos;ll check if you have an account and guide you accordingly
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Verification Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="000000"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))
                }
                className="text-center text-2xl tracking-widest"
                disabled={isLoading}
                maxLength={6}
                required
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Enter the 6-digit code sent to your email
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isLoading}
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Continue'
                )}
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setStep('email')
                setOtpCode('')
              }}
              disabled={isLoading}
              className="w-full"
            >
              Resend Code
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
