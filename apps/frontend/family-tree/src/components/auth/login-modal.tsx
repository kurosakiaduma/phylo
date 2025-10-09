'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Loader2 } from 'lucide-react'
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

interface LoginModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function LoginModal({ open, onOpenChange }: LoginModalProps) {
  const [email, setEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const { setUser } = useAuth()
  const router = useRouter()

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: 'Invalid Email',
        description: 'Please enter a valid email address.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      await authApi.requestOTP(email, false) // is_registration=false for login
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
        toast({
          title: 'Welcome back! 👋',
          description: `Signed in as ${response.user.email}`,
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
    setStep('email')
    setOtpCode('')
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after animation
    setTimeout(() => {
      setStep('email')
      setEmail('')
      setOtpCode('')
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="backdrop-blur-md sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {step === 'email' ? 'Welcome Back' : 'Enter Code'}
          </DialogTitle>
          <DialogDescription>
            {step === 'email'
              ? 'Sign in to your Phylo account to continue building your family tree.'
              : `We sent a verification code to ${email}`}
          </DialogDescription>
        </DialogHeader>

        {step === 'email' ? (
          <form onSubmit={handleRequestOTP} className="space-y-4 pt-4">
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
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Code...
                </>
              ) : (
                'Send Verification Code'
              )}
            </Button>

            <p className="text-center text-sm text-muted-foreground">
              No account? You will be sent an invite. Ask a family custodian :-)
            </p>
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
                Back
              </Button>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Sign In'
                )}
              </Button>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRequestOTP}
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
