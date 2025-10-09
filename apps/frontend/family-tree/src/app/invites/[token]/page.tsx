'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Loader2,
  Users,
  Shield,
  Eye,
  Edit,
  AlertTriangle,
  LogOut,
} from 'lucide-react'
import { PhyloLogo } from '@/components/ui/phylo-logo'
import { AuthModal } from '@/components/auth/auth-modal'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'

interface InviteDetail {
  id: string
  tree_id: string
  tree_name: string
  tree_description?: string
  email: string
  role: string
  token: string
  expires_at: string
  created_at: string
  inviter_name?: string
  member_name?: string
}

const roleIcons = {
  custodian: Shield,
  contributor: Edit,
  viewer: Eye,
}

const roleDescriptions = {
  custodian: 'Full access including invites and settings',
  contributor: 'Can add and edit family members',
  viewer: 'Can view the family tree',
}

export default function InviteAcceptPage() {
  const params = useParams()
  const router = useRouter()
  const { user, isLoading: authLoading, logout } = useAuth()
  const { toast } = useToast()

  const token = params.token as string
  const [invite, setInvite] = useState<InviteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [emailMismatch, setEmailMismatch] = useState(false)

  useEffect(() => {
    if (token) {
      fetchInviteDetails()
    }
  }, [token])

  // Check for email mismatch when user changes
  useEffect(() => {
    if (user && invite) {
      const mismatch = user.email.toLowerCase() !== invite.email.toLowerCase()
      setEmailMismatch(mismatch)
    } else {
      setEmailMismatch(false)
    }
  }, [user, invite])

  const fetchInviteDetails = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/invites/${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      if (response.ok) {
        const inviteData = await response.json()
        setInvite(inviteData)
      } else {
        const errorData = await response.json()
        setError(errorData.detail || 'Invitation not found or expired')
      }
    } catch (err) {
      setError('Failed to load invitation details')
    } finally {
      setLoading(false)
    }
  }

  const handleAcceptInvite = async () => {
    if (!user) {
      // Store return URL and open auth modal with invite email
      sessionStorage.setItem('redirectAfterLogin', window.location.pathname)
      setLoginOpen(true)
      return
    }

    // Check if user is already a member of this tree
    if (user && invite) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/trees/${invite.tree_id}/members`,
          {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
            },
          },
        )

        if (response.ok) {
          const members = await response.json()
          const existingMember = members.find((m: any) => m.id === user.id)

          if (existingMember) {
            toast({
              title: 'Already a Member',
              description: `You're already a member of ${invite.tree_name}. Redirecting to the tree...`,
            })
            router.push(`/trees/${invite.tree_id}`)
            return
          }
        }
      } catch (error) {
        // Continue with normal flow if check fails
      }
    }

    // Check for email mismatch
    if (emailMismatch) {
      toast({
        title: 'Email Mismatch',
        description: `This invitation is for ${invite?.email}, but you're logged in as ${user.email}. Please sign out and sign in with the correct email.`,
        variant: 'destructive',
      })
      return
    }

    try {
      setAccepting(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/invites/${token}/accept`,
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      )

      if (response.ok) {
        toast({
          title: 'Welcome to the family!',
          description: `You've successfully joined ${invite?.tree_name} as a ${invite?.role}.`,
        })

        // Redirect to the tree
        router.push(`/trees/${invite?.tree_id}`)
      } else {
        const errorData = await response.json()
        toast({
          title: 'Failed to accept invitation',
          description: errorData.detail || 'Please try again.',
          variant: 'destructive',
        })
      }
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to accept invitation. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setAccepting(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="relative">
                  <PhyloLogo
                    className="h-16 w-16 text-green-600 dark:text-green-400 animate-pulse"
                    size={64}
                  />
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400 absolute -top-1 -right-1" />
                </div>
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground">
                  Getting things ready...
                </h1>
                <p className="text-muted-foreground">
                  We're preparing your invitation details
                </p>
              </div>

              {/* Animated screenshots carousel placeholder */}
              <div className="bg-muted rounded-lg p-8 space-y-4">
                <div className="flex justify-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
                  <div
                    className="w-3 h-3 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className="w-3 h-3 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Loading Phylo features...
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-900 dark:to-orange-900 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="text-red-500 dark:text-red-400">
              <PhyloLogo className="h-16 w-16 mx-auto mb-4" size={64} />
            </div>
            <h1 className="text-xl font-bold text-foreground">
              Invitation Issue
            </h1>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => router.push('/')} variant="outline">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!invite) {
    return null
  }

  const RoleIcon = roleIcons[invite.role as keyof typeof roleIcons] || Users
  const displayName = invite.member_name || invite.email.split('@')[0]

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900 dark:to-blue-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Header */}
            <div className="flex justify-center">
              <div className="relative">
                <PhyloLogo
                  className="h-16 w-16 text-green-600 dark:text-green-400"
                  size={64}
                />
                <div className="absolute -top-2 -right-2 bg-blue-600 dark:bg-blue-500 text-white rounded-full p-1">
                  <RoleIcon className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Welcome Message */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold text-foreground">
                Hi, {displayName}!
              </h1>
              <p className="text-lg text-muted-foreground">
                We are getting your{' '}
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {invite.role}
                </span>{' '}
                account ready in the{' '}
                <span className="font-semibold text-green-600 dark:text-green-400">
                  '{invite.tree_name}'
                </span>{' '}
                Phylo.
              </p>
            </div>

            {/* Invitation Details */}
            <div className="bg-card rounded-lg border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <h3 className="font-semibold text-foreground">
                    {invite.tree_name}
                  </h3>
                  {invite.tree_description && (
                    <p className="text-sm text-muted-foreground">
                      {invite.tree_description}
                    </p>
                  )}
                </div>
                <PhyloLogo
                  className="h-8 w-8 text-green-600 dark:text-green-400"
                  size={32}
                />
              </div>

              <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <RoleIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <p className="font-medium text-blue-900 dark:text-blue-100 capitalize">
                    {invite.role}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {
                      roleDescriptions[
                        invite.role as keyof typeof roleDescriptions
                      ]
                    }
                  </p>
                </div>
              </div>

              {invite.inviter_name && (
                <p className="text-sm text-muted-foreground">
                  Invited by{' '}
                  <span className="font-medium">{invite.inviter_name}</span>
                </p>
              )}
            </div>

            {/* Email Mismatch Warning */}
            {emailMismatch && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 space-y-3">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-yellow-800 dark:text-yellow-200">
                      Email Mismatch
                    </h4>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      This invitation is for <strong>{invite?.email}</strong>,
                      but you're signed in as <strong>{user?.email}</strong>.
                    </p>
                  </div>
                </div>
                <Button
                  onClick={logout}
                  variant="outline"
                  size="sm"
                  className="w-full border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-100 dark:hover:bg-yellow-900/40"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out & Use Correct Email
                </Button>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              {user ? (
                <Button
                  onClick={handleAcceptInvite}
                  disabled={accepting || emailMismatch}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 disabled:opacity-50"
                  size="lg"
                >
                  {accepting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Joining Phylo...
                    </>
                  ) : emailMismatch ? (
                    <>
                      <AlertTriangle className="mr-2 h-4 w-4" />
                      Email Mismatch
                    </>
                  ) : (
                    <>
                      <PhyloLogo className="mr-2 h-4 w-4" size={16} />
                      Accept & Join Phylo
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    sessionStorage.setItem(
                      'redirectAfterLogin',
                      window.location.pathname,
                    )
                    setLoginOpen(true)
                  }}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                  size="lg"
                >
                  <PhyloLogo className="mr-2 h-4 w-4" size={16} />
                  Sign In to Accept
                </Button>
              )}

              <p className="text-xs text-muted-foreground">
                By accepting, you agree to join this Phylo and collaborate with
                other members.
              </p>
            </div>

            {/* Animated Features Preview */}
            <div className="bg-muted rounded-lg p-6 space-y-4">
              <h4 className="font-medium text-foreground">
                What you'll get access to:
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span>Interactive family tree</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"
                    style={{ animationDelay: '0.5s' }}
                  ></div>
                  <span>Member profiles & photos</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div
                    className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"
                    style={{ animationDelay: '1s' }}
                  ></div>
                  <span>Relationship tracking</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auth Modal */}
      <AuthModal
        open={loginOpen}
        onOpenChange={setLoginOpen}
        inviteEmail={invite?.email}
        mode="auto"
      />
    </div>
  )
}
