'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Loader2, UserPlus } from 'lucide-react'
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

interface RegisterModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function RegisterModal({ open, onOpenChange }: RegisterModalProps) {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [step, setStep] = useState<'info' | 'otp'>('info')
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

    if (!displayName || displayName.trim().length < 2) {
      toast({
        title: 'Invalid Name',
        description: 'Please enter your name (at least 2 characters).',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      await authApi.requestOTP(email, true) // is_registration=true for registration
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
      const response = await authApi.verifyOTP(email, otpCode, displayName)
      if (response.user) {
        setUser(response.user)
        toast({
          title: 'Welcome to Phylo! 🎉',
          description: `Account created for ${
            displayName || response.user.email
          }`,
        })
        onOpenChange(false)

        // Redirect to onboarding or dashboard
        router.push('/onboarding')
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
    setStep('info')
    setOtpCode('')
  }

  const handleClose = () => {
    onOpenChange(false)
    // Reset state after animation
    setTimeout(() => {
      setStep('info')
      setEmail('')
      setDisplayName('')
      setOtpCode('')
    }, 200)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="backdrop-blur-md sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            {step === 'info' ? (
              <>
                <UserPlus className="h-6 w-6" />
                Get Started
              </>
            ) : (
              'Enter Code'
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'info'
              ? 'Create your Phylo account and start building your family tree today.'
              : `We sent a verification code to ${email}`}
          </DialogDescription>
        </DialogHeader>

        {step === 'info' ? (
          <form onSubmit={handleRequestOTP} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="display-name">Your Name</Label>
              <Input
                id="display-name"
                type="text"
                placeholder="John Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="register-email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="register-email"
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
                'Continue'
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              By continuing, you agree to our Terms of Service and Privacy
              Policy
            </p>
          </form>
        ) : (
          <form onSubmit={handleVerifyOTP} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="register-otp">Verification Code</Label>
              <Input
                id="register-otp"
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
                    Creating...
                  </>
                ) : (
                  'Create Account'
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
