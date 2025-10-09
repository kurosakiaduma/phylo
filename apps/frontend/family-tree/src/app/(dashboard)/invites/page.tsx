'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/dashboard-layout'
import { SendInviteDialog } from '@/components/SendInviteDialog'
import { useTreeMembers } from '@/hooks/use-tree-members'
import {
  Mail,
  Plus,
  Trash2,
  RefreshCw,
  Copy,
  CheckCircle2,
  XCircle,
  Clock,
  TreePine,
} from 'lucide-react'

interface Tree {
  id: string
  name: string
  role: string
}

interface Invite {
  id: string
  email: string
  role: string
  token: string
  tree_id: string
  tree_name: string
  expires_at: string
  accepted_at: string | null
  created_at: string
  created_by_name: string
  resend_count: number
  member_id?: string
}

export default function InvitesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [trees, setTrees] = useState<Tree[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [selectedTreeId, setSelectedTreeId] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // Fetch tree members for the selected tree
  const { members } = useTreeMembers({
    treeId: selectedTreeId,
    autoFetch: !!selectedTreeId,
  })

  useEffect(() => {
    if (!user) {
      router.push('/')
      return
    }
    fetchTrees()
  }, [user])

  useEffect(() => {
    if (selectedTreeId) {
      fetchInvites(selectedTreeId)
    }
  }, [selectedTreeId])

  const fetchTrees = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trees`, {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to fetch trees')

      const data = await response.json()
      // Filter only custodian trees
      const custodianTrees = data.filter(
        (tree: Tree) => tree.role === 'custodian',
      )
      setTrees(custodianTrees)

      if (custodianTrees.length > 0 && !selectedTreeId) {
        setSelectedTreeId(custodianTrees[0].id)
      }
    } catch (error) {
      console.error('Error fetching trees:', error)
      toast({
        title: 'Error',
        description: 'Failed to load your trees. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const fetchInvites = async (treeId: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trees/${treeId}/invites`,
        {
          credentials: 'include',
        },
      )

      if (!response.ok) throw new Error('Failed to fetch invites')

      const data = await response.json()
      setInvites(data)
    } catch (error) {
      console.error('Error fetching invites:', error)
      toast({
        title: 'Error',
        description: 'Failed to load invitations. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendInvite = async (
    token: string,
    currentResendCount: number,
  ) => {
    if (currentResendCount >= 3) {
      toast({
        title: 'Resend Limit Reached',
        description:
          'This invitation has reached the maximum resend limit (3). Please delete and create a new invitation.',
        variant: 'destructive',
      })
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/invites/${token}/resend`,
        {
          method: 'POST',
          credentials: 'include',
        },
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to resend invite')
      }

      toast({
        title: 'Invite Resent! 📧',
        description: 'Invitation has been resent.',
      })

      if (selectedTreeId) {
        fetchInvites(selectedTreeId)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description:
          error instanceof Error
            ? error.message
            : 'Failed to resend invitation.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancelInvite = async (token: string) => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/invites/${token}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )

      if (!response.ok) throw new Error('Failed to cancel invite')

      toast({
        title: 'Invite Canceled',
        description: 'Invitation has been canceled.',
      })

      if (selectedTreeId) {
        fetchInvites(selectedTreeId)
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to cancel invitation.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const copyInviteLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/invites/${token}`
    navigator.clipboard.writeText(inviteUrl)
    toast({
      title: 'Copied!',
      description: 'Invite link copied to clipboard.',
    })
  }

  const getStatusBadge = (invite: Invite) => {
    if (invite.accepted_at) {
      return (
        <Badge className="bg-green-500">
          <CheckCircle2 className="w-3 h-3 mr-1" /> Accepted
        </Badge>
      )
    }

    const expiresAt = new Date(invite.expires_at)
    const now = new Date()

    if (expiresAt < now) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" /> Expired
        </Badge>
      )
    }

    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" /> Pending
      </Badge>
    )
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      custodian: 'bg-purple-500',
      contributor: 'bg-blue-500',
      viewer: 'bg-gray-500',
    }
    return (
      <Badge className={colors[role as keyof typeof colors] || 'bg-gray-500'}>
        {role}
      </Badge>
    )
  }

  const canResend = (invite: Invite) => {
    return (
      !invite.accepted_at &&
      new Date(invite.expires_at) > new Date() &&
      invite.resend_count < 3
    )
  }

  const getResendInfo = (invite: Invite) => {
    if (invite.resend_count === 0) return null

    const remaining = 3 - invite.resend_count
    if (remaining === 0) {
      return (
        <span className="text-xs text-red-600 font-medium">
          Max resends reached
        </span>
      )
    }

    return (
      <span className="text-xs text-amber-600">
        {invite.resend_count}/3 resends ({remaining} left)
      </span>
    )
  }

  if (trees.length === 0) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>No Trees Available</CardTitle>
              <CardDescription>
                You need to be a custodian of at least one tree to manage
                invitations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/trees')}>
                <TreePine className="h-4 w-4 mr-2" />
                Go to Trees
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invitations</h1>
            <p className="text-muted-foreground">
              Manage invitations to your family trees
            </p>
          </div>

          <Button
            onClick={() => {
              if (!selectedTreeId) {
                toast({
                  title: 'Select a Tree',
                  description:
                    'Please select a tree first to send invitations.',
                  variant: 'destructive',
                })
                return
              }
              setIsDialogOpen(true)
            }}
            disabled={!selectedTreeId}
          >
            <Plus className="w-4 h-4 mr-2" />
            Send Invite
          </Button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Label>Select Tree:</Label>
            <Select value={selectedTreeId} onValueChange={setSelectedTreeId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select a tree" />
              </SelectTrigger>
              <SelectContent>
                {trees.map((tree) => (
                  <SelectItem key={tree.id} value={tree.id}>
                    {tree.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Invitations</CardTitle>
              <CardDescription>
                {invites.length} invitation{invites.length !== 1 ? 's' : ''} for
                this tree
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading invitations...
                </div>
              ) : invites.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No invitations sent yet</p>
                  <p className="text-sm">
                    Send your first invitation to get started
                  </p>
                </div>
              ) : (
                <>
                  {/* Desktop Table View */}
                  <div className="hidden md:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Resends</TableHead>
                          <TableHead>Sent By</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invites.map((invite) => (
                          <TableRow key={invite.id}>
                            <TableCell className="font-medium">
                              {invite.email}
                            </TableCell>
                            <TableCell>{getRoleBadge(invite.role)}</TableCell>
                            <TableCell>{getStatusBadge(invite)}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="text-sm">
                                  {invite.resend_count}/3
                                </span>
                                {getResendInfo(invite)}
                              </div>
                            </TableCell>
                            <TableCell>{invite.created_by_name}</TableCell>
                            <TableCell>
                              {new Date(invite.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {!invite.accepted_at &&
                                  new Date(invite.expires_at) > new Date() && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          copyInviteLink(invite.token)
                                        }
                                        title="Copy invite link"
                                        className="hover:bg-blue-50"
                                      >
                                        <Copy className="w-4 h-4" />
                                        <span className="sr-only">
                                          Copy invite link
                                        </span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleResendInvite(
                                            invite.token,
                                            invite.resend_count,
                                          )
                                        }
                                        title={
                                          canResend(invite)
                                            ? 'Resend invitation'
                                            : 'Maximum resends reached'
                                        }
                                        className="hover:bg-green-50"
                                        disabled={!canResend(invite)}
                                      >
                                        <RefreshCw className="w-4 h-4" />
                                        <span className="sr-only">
                                          Resend invitation
                                        </span>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleCancelInvite(invite.token)
                                        }
                                        title="Cancel invitation"
                                        className="hover:bg-red-50"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="sr-only">
                                          Cancel invitation
                                        </span>
                                      </Button>
                                    </>
                                  )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Mobile Card View */}
                  <div className="md:hidden space-y-4">
                    {invites.map((invite) => (
                      <Card key={invite.id} className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {invite.email}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {getRoleBadge(invite.role)}
                                {getStatusBadge(invite)}
                              </div>
                            </div>
                          </div>

                          <div className="text-sm text-muted-foreground space-y-1">
                            <p>Sent by: {invite.created_by_name}</p>
                            <p>
                              Created:{' '}
                              {new Date(invite.created_at).toLocaleDateString()}
                            </p>
                            <div className="flex items-center gap-2">
                              <span>Resends: {invite.resend_count}/3</span>
                              {getResendInfo(invite)}
                            </div>
                          </div>

                          {!invite.accepted_at &&
                            new Date(invite.expires_at) > new Date() && (
                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => copyInviteLink(invite.token)}
                                  className="flex-1"
                                >
                                  <Copy className="w-4 h-4 mr-2" />
                                  Copy Link
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleResendInvite(
                                      invite.token,
                                      invite.resend_count,
                                    )
                                  }
                                  disabled={!canResend(invite)}
                                  className="flex-1"
                                >
                                  <RefreshCw className="w-4 h-4 mr-2" />
                                  Resend
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleCancelInvite(invite.token)
                                  }
                                  className="flex-1"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Cancel
                                </Button>
                              </div>
                            )}
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Send Invite Dialog */}
        <SendInviteDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          treeId={selectedTreeId}
          members={selectedTreeId ? members : []}
          onInviteSent={() => {
            setIsDialogOpen(false)
            if (selectedTreeId) {
              fetchInvites(selectedTreeId)
            }
          }}
        />
      </div>
    </DashboardLayout>
  )
}
