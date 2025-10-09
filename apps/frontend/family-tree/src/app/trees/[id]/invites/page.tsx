'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SendInviteDialog } from '@/components/SendInviteDialog'
import { useToast } from '@/hooks/use-toast'
import { useTreeMembers } from '@/hooks/use-tree-members'
import { ArrowLeft, Mail, Plus, Loader2, Users } from 'lucide-react'

interface Tree {
  id: string
  name: string
  description?: string
  role: 'custodian' | 'contributor' | 'viewer'
}

interface Invite {
  id: string
  tree_id: string
  email: string
  role: string
  token: string
  expires_at: string
  accepted_at?: string
  created_at: string
}

export default function InvitesPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [tree, setTree] = useState<Tree | null>(null)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [sendDialogOpen, setSendDialogOpen] = useState(false)

  const treeId = params.id as string

  // Fetch tree members for the send invite dialog
  const { members } = useTreeMembers({ treeId, autoFetch: true })

  useEffect(() => {
    fetchTreeAndInvites()
  }, [treeId])

  const fetchTreeAndInvites = async () => {
    try {
      setLoading(true)

      // Fetch tree details
      const treeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trees/${treeId}`,
        { credentials: 'include' },
      )

      if (!treeResponse.ok) {
        throw new Error('Failed to fetch tree')
      }

      const treeData = await treeResponse.json()
      setTree(treeData)

      // Fetch invites
      const invitesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trees/${treeId}/invites`,
        { credentials: 'include' },
      )

      if (invitesResponse.ok) {
        const invitesData = await invitesResponse.json()
        setInvites(invitesData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load invites. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
  const handleInviteSent = () => {
    fetchTreeAndInvites() // Refresh the invites list
    setSendDialogOpen(false)
  }

  const handleResendInvite = async (token: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/invites/${token}/resend`,
        {
          method: 'POST',
          credentials: 'include',
        },
      )

      if (response.ok) {
        toast({
          title: 'Invite Resent',
          description: 'The invitation has been resent successfully.',
        })
        fetchTreeAndInvites()
      } else {
        throw new Error('Failed to resend invite')
      }
    } catch (error) {
      console.error('Error resending invite:', error)
      toast({
        title: 'Error',
        description: 'Failed to resend invite. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleCancelInvite = async (token: string) => {
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/invites/${token}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )

      if (response.ok) {
        toast({
          title: 'Invite Cancelled',
          description: 'The invitation has been cancelled.',
        })
        fetchTreeAndInvites()
      } else {
        throw new Error('Failed to cancel invite')
      }
    } catch (error) {
      console.error('Error cancelling invite:', error)
      toast({
        title: 'Error',
        description: 'Failed to cancel invite. Please try again.',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading invites...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!tree) {
    return null
  }

  // Check if user is custodian
  const isCustodian = tree.role === 'custodian'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invitations</h1>
            <p className="text-muted-foreground">{tree.name}</p>
          </div>
        </div>

        {/* Send Invite Button */}
        {isCustodian && (
          <div className="flex justify-end">
            <Button onClick={() => setSendDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Send Invite
            </Button>
          </div>
        )}

        {/* Invites List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Pending Invitations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invites.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Invitations</h3>
                <p className="text-muted-foreground mb-4">
                  {isCustodian
                    ? "You haven't sent any invitations yet."
                    : 'There are no pending invitations for this tree.'}
                </p>
                {isCustodian && (
                  <Button onClick={() => setSendDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Send First Invite
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <p className="text-sm text-muted-foreground">
                        Role: {invite.role} • Expires:{' '}
                        {new Date(invite.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                    {isCustodian && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResendInvite(invite.token)}
                        >
                          Resend
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelInvite(invite.token)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Invite Dialog */}
      <SendInviteDialog
        open={sendDialogOpen}
        onOpenChange={setSendDialogOpen}
        treeId={treeId}
        members={members}
        onInviteSent={handleInviteSent}
      />
    </DashboardLayout>
  )
}
