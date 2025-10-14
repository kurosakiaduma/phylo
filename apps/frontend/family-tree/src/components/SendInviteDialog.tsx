'use client'

import { useState } from 'react'
import { TreeMember } from '@/types/member'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Mail } from 'lucide-react'

interface SendInviteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  treeId: string
  members: TreeMember[]
  onInviteSent: () => void
}

export function SendInviteDialog({
  open,
  onOpenChange,
  treeId,
  members,
  onInviteSent,
}: SendInviteDialogProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>('')
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [emailInput, setEmailInput] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const selectedMember = members.find((m) => m.id === selectedMemberId)
  const memberHasEmail =
    selectedMember?.email && selectedMember.email.trim() !== ''

  const handleSendInvite = async () => {
    if (!selectedMember || !selectedRole) {
      toast({
        title: 'Missing Information',
        description: 'Please select a member and role.',
        variant: 'destructive',
      })
      return
    }

    const emailToUse = memberHasEmail ? selectedMember.email : emailInput.trim()

    if (!emailToUse) {
      toast({
        title: 'Email Required',
        description: 'Please provide an email address for the invitation.',
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)

      // If member doesn't have email, update their record first
      if (!memberHasEmail && emailInput.trim()) {
        const updateResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/members/${selectedMember.id}`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
              email: emailInput.trim(),
            }),
          },
        )

        if (!updateResponse.ok) {
          if (updateResponse.status === 400) {
            const errorData = await updateResponse.json()

            throw new Error(errorData.detail ||
              "The email you&apos;ve provided is either a duplicate or invalid.",
            )
          }
          throw new Error('Failed to update member email. A')
        }
      }

      // Send the invite
      const inviteResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/invites`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            tree_id: treeId,
            member_id: selectedMember.id,
            email: emailToUse,
            role: selectedRole,
          }),
        },
      )

      if (!inviteResponse.ok) {
        const errorData = await inviteResponse.json()
        throw new Error(errorData.detail || 'Failed to send invite')
      }

      toast({
        title: 'Invite Sent',
        description: `Invitation sent to ${emailToUse} successfully.`,
      })

      // Reset form
      setSelectedMemberId('')
      setSelectedRole('')
      setEmailInput('')
      onInviteSent()
    } catch (error) {

      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to send invite',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleMemberChange = (memberId: string) => {
    setSelectedMemberId(memberId)
    setEmailInput('') // Reset email input when changing members
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Send Invitation
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a family member to join this tree.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Member Selection */}
          <div className="space-y-2">
            <Label>Select Member</Label>
            <SearchableSelect
              id="member-select"
              value={selectedMemberId}
              onValueChange={handleMemberChange}
              placeholder="Choose a family member"
              searchPlaceholder="Search family members..."
              options={members.map((member) => ({
                value: member.id,
                label: `${member.name}${member.email ? ' ✓' : ''}`,
              }))}
            />
            {selectedMember && (
              <p className="text-xs text-muted-foreground">
                {selectedMember.email ? (
                  <span className="text-green-600">✓ Email configured</span>
                ) : (
                  <span className="text-amber-600">
                    ⚠ No email - will be added below
                  </span>
                )}
              </p>
            )}
          </div>

          {/* Email Display/Input */}
          {selectedMember && (
            <div className="space-y-2">
              <Label>Email Address</Label>
              {memberHasEmail ? (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">{selectedMember.email}</p>
                  <p className="text-xs text-muted-foreground">
                    Email already configured for this member
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="email"
                    placeholder="Enter email address"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    This email will be saved to the member&apos;s profile
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">
                  <div>
                    <p className="font-medium">Viewer</p>
                    <p className="text-xs text-muted-foreground">
                      Can view the tree but not make changes
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value="contributor">
                  <div>
                    <p className="font-medium">Contributor</p>
                    <p className="text-xs text-muted-foreground">
                      Can add and edit family members
                    </p>
                  </div>
                </SelectItem>
                <SelectItem value="custodian">
                  <div>
                    <p className="font-medium">Custodian</p>
                    <p className="text-xs text-muted-foreground">
                      Full access including invites and settings
                    </p>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSendInvite}
              disabled={loading || !selectedMember || !selectedRole}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
