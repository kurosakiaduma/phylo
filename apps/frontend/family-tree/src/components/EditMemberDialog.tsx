/**
 * EditMemberDialog - Comprehensive member editing with relationship management
 * Allows custodians to add/remove parents and spouses with proper validation
 */

'use client'

import { useState, useEffect } from 'react'
import { TreeMember } from '@/types/member'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { Loader2, UserPlus, UserMinus, AlertTriangle, X } from 'lucide-react'
import { AvatarUpload } from '@/components/avatar-upload'

interface EditMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: TreeMember | null
  allMembers: TreeMember[]
  treeSettings: {
    maxParentsPerChild?: number
    maxSpousesPerMember?: number
    allowSameSex?: boolean
    monogamy?: boolean
  }
  onSuccess?: () => void
  onMemberUpdate?: () => void // Called when member data changes (like avatar upload)
}

interface ValidationWarning {
  type: 'generation_mismatch' | 'max_exceeded' | 'circular_relationship'
  message: string
  consequences: string
}

export function EditMemberDialog({
  open,
  onOpenChange,
  member,
  allMembers,
  treeSettings,
  onSuccess,
  onMemberUpdate,
}: EditMemberDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [showWarningDialog, setShowWarningDialog] = useState(false)
  const [validationWarning, setValidationWarning] =
    useState<ValidationWarning | null>(null)
  const [pendingAction, setPendingAction] = useState<
    (() => Promise<void>) | null
  >(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    avatar_url: '',
    gender: '',
    pronouns: '',
    dob: '',
    dod: '',
    deceased: false,
    birth_place: '',
    death_place: '',
    occupation: '',
    bio: '',
    notes: '',
  })

  const [selectedParents, setSelectedParents] = useState<string[]>([])
  const [selectedSpouses, setSelectedSpouses] = useState<string[]>([])
  const [newSpouseName, setNewSpouseName] = useState('')
  const [newSpouseGender, setNewSpouseGender] = useState('')

  // Initialize form when member changes
  useEffect(() => {
    if (member) {
      setFormData({
        name: member.name || '',
        email: member.email || '',
        avatar_url: member.avatar_url || '',
        gender: member.gender || '',
        pronouns: member.pronouns || '',
        dob: member.dob || '',
        dod: member.dod || '',
        deceased: member.deceased || false,
        birth_place: member.birth_place || '',
        death_place: member.death_place || '',
        occupation: member.occupation || '',
        bio: member.bio || '',
        notes: member.notes || '',
      })
      setSelectedParents(member.parentIds || [])
      setSelectedSpouses(member.spouseIds || [])
    }
  }, [member])

  if (!member) return null

  /**
   * Calculate generation level of a member based on their ancestors
   */
  const calculateGeneration = (
    memberId: string,
    visited = new Set<string>(),
  ): number => {
    if (visited.has(memberId)) return 0 // Circular reference protection
    visited.add(memberId)

    const m = allMembers.find((mem) => mem.id === memberId)
    if (!m || m.parentIds.length === 0) return 0

    const parentGenerations = m.parentIds
      .map((pid) => calculateGeneration(pid, visited))
      .filter((g) => g !== null)

    return parentGenerations.length > 0 ? Math.max(...parentGenerations) + 1 : 0
  }

  /**
   * Check if adding a parent would cause generation mismatch
   */
  const validateParentGeneration = (
    parentId: string,
  ): ValidationWarning | null => {
    const memberGeneration = calculateGeneration(member.id)
    const parentGeneration = calculateGeneration(parentId)

    // Parent should be in a previous generation (lower number)
    if (parentGeneration >= memberGeneration) {
      return {
        type: 'generation_mismatch',
        message: `Generation mismatch: The selected parent is in the same or later generation as ${member.name}.`,
        consequences:
          'This may cause layout issues and logical inconsistencies in the family tree. The tree structure may not reflect accurate generational relationships.',
      }
    }

    return null
  }

  /**
   * Check if adding a parent would exceed max parents limit
   */
  const validateMaxParents = (
    newParentCount: number,
  ): ValidationWarning | null => {
    const maxParents = treeSettings.maxParentsPerChild || Infinity
    if (newParentCount > maxParents) {
      return {
        type: 'max_exceeded',
        message: `Maximum parents exceeded: This tree allows a maximum of ${maxParents} parent(s) per child.`,
        consequences: `${member.name} currently has ${selectedParents.length} parent(s). Adding more would violate tree settings.`,
      }
    }
    return null
  }

  /**
   * Check if adding a spouse would exceed max spouses limit
   */
  const validateMaxSpouses = (
    newSpouseCount: number,
  ): ValidationWarning | null => {
    if (treeSettings.monogamy && newSpouseCount > 1) {
      return {
        type: 'max_exceeded',
        message:
          'Monogamy enforced: This tree only allows one spouse per member.',
        consequences: `${member.name} already has a spouse. Remove existing spouse before adding a new one.`,
      }
    }

    const maxSpouses = treeSettings.maxSpousesPerMember || Infinity
    if (newSpouseCount > maxSpouses) {
      return {
        type: 'max_exceeded',
        message: `Maximum spouses exceeded: This tree allows a maximum of ${maxSpouses} spouse(s) per member.`,
        consequences: `${member.name} would have ${newSpouseCount} spouse(s), which exceeds the limit.`,
      }
    }

    return null
  }

  /**
   * Check for circular relationships
   */
  const validateCircularRelationship = (
    parentId: string,
  ): ValidationWarning | null => {
    // Check if the potential parent is actually a descendant of this member
    const isDescendant = (
      ancestorId: string,
      descendantId: string,
      visited = new Set<string>(),
    ): boolean => {
      if (visited.has(descendantId)) return false
      visited.add(descendantId)

      const descendant = allMembers.find((m) => m.id === descendantId)
      if (!descendant) return false

      if (descendant.parentIds.includes(ancestorId)) return true

      return descendant.parentIds.some((pid) =>
        isDescendant(ancestorId, pid, visited),
      )
    }

    if (isDescendant(member.id, parentId)) {
      return {
        type: 'circular_relationship',
        message:
          'Circular relationship detected: The selected parent is a descendant of this member.',
        consequences:
          'This would create a logical impossibility (parent being their own ancestor/descendant).',
      }
    }

    return null
  }

  /**
   * Handle adding a parent
   */
  const handleAddParent = async (parentId: string) => {
    // Validation checks
    const circularWarning = validateCircularRelationship(parentId)
    if (circularWarning) {
      setValidationWarning(circularWarning)
      setShowWarningDialog(true)
      return
    }

    const maxParentsWarning = validateMaxParents(selectedParents.length + 1)
    if (maxParentsWarning) {
      toast({
        title: 'Cannot Add Parent',
        description: maxParentsWarning.message,
        variant: 'destructive',
      })
      return
    }

    const generationWarning = validateParentGeneration(parentId)
    if (generationWarning) {
      setValidationWarning(generationWarning)
      setPendingAction(() => async () => {
        await addParentRelationship(parentId)
      })
      setShowWarningDialog(true)
      return
    }

    // No warnings, proceed
    await addParentRelationship(parentId)
  }

  /**
   * Actually add the parent relationship
   */
  const addParentRelationship = async (parentId: string) => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050/api'
      const response = await fetch(
        `${baseUrl}/members/${parentId}/children?child_id=${member.id}`,
        {
          method: 'POST',
          credentials: 'include',
        },
      )

      if (!response.ok) {
        throw new Error('Failed to add parent relationship')
      }

      setSelectedParents([...selectedParents, parentId])
      toast({
        title: 'Parent Added',
        description: 'Parent relationship created successfully',
      })
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add parent relationship',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handle removing a parent
   */
  const handleRemoveParent = async (parentId: string) => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050/api'
      // Find the relationship ID (would need to be tracked or fetched)
      // For now, we'll use the delete endpoint directly
      const response = await fetch(
        `${baseUrl}/members/${parentId}/children/${member.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )

      if (!response.ok) {
        throw new Error('Failed to remove parent relationship')
      }

      setSelectedParents(selectedParents.filter((id) => id !== parentId))
      toast({
        title: 'Parent Removed',
        description: 'Parent relationship removed successfully',
      })
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove parent relationship',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handle adding an existing spouse
   */
  const handleAddExistingSpouse = async (spouseId: string) => {
    const maxSpousesWarning = validateMaxSpouses(selectedSpouses.length + 1)
    if (maxSpousesWarning) {
      toast({
        title: 'Cannot Add Spouse',
        description: maxSpousesWarning.message,
        variant: 'destructive',
      })
      return
    }

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050/api'
      const response = await fetch(
        `${baseUrl}/members/${member.id}/spouse?spouse_id=${spouseId}`,
        {
          method: 'POST',
          credentials: 'include',
        },
      )

      if (!response.ok) {
        throw new Error('Failed to add spouse relationship')
      }

      setSelectedSpouses([...selectedSpouses, spouseId])
      toast({
        title: 'Spouse Added',
        description: 'Spouse relationship created successfully',
      })
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add spouse relationship',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handle creating and adding a new spouse
   */
  const handleAddNewSpouse = async () => {
    if (!newSpouseName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter spouse name',
        variant: 'destructive',
      })
      return
    }

    const maxSpousesWarning = validateMaxSpouses(selectedSpouses.length + 1)
    if (maxSpousesWarning) {
      toast({
        title: 'Cannot Add Spouse',
        description: maxSpousesWarning.message,
        variant: 'destructive',
      })
      return
    }

    try {
      setLoading(true)
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050/api'

      // First create the new member
      const createResponse = await fetch(
        `${baseUrl}/trees/${member.tree_id}/members`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            name: newSpouseName.trim(),
            gender: newSpouseGender || undefined,
            deceased: false,
          }),
        },
      )

      if (!createResponse.ok) {
        throw new Error('Failed to create spouse member')
      }

      const newSpouse = await createResponse.json()

      // Then create the spouse relationship
      const spouseResponse = await fetch(
        `${baseUrl}/members/${member.id}/spouse?spouse_id=${newSpouse.id}`,
        {
          method: 'POST',
          credentials: 'include',
        },
      )

      if (!spouseResponse.ok) {
        throw new Error('Failed to create spouse relationship')
      }

      setSelectedSpouses([...selectedSpouses, newSpouse.id])
      setNewSpouseName('')
      setNewSpouseGender('')
      toast({
        title: 'Spouse Added',
        description: `${newSpouseName} has been added as spouse`,
      })
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add new spouse',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle removing a spouse
   */
  const handleRemoveSpouse = async (spouseId: string) => {
    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050/api'
      const response = await fetch(
        `${baseUrl}/members/${member.id}/spouse/${spouseId}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      )

      if (!response.ok) {
        throw new Error('Failed to remove spouse relationship')
      }

      setSelectedSpouses(selectedSpouses.filter((id) => id !== spouseId))
      toast({
        title: 'Spouse Removed',
        description: 'Spouse relationship removed successfully',
      })
      onSuccess?.()
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove spouse relationship',
        variant: 'destructive',
      })
    }
  }

  /**
   * Handle saving basic member info
   */
  const handleSaveBasicInfo = async () => {
    try {
      setLoading(true)
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050/api'

      // Create update payload that matches MemberUpdate interface
      // Filter out empty strings and undefined values
      const updatePayload: Partial<TreeMember> = {}

      // Only include fields that have values or are explicitly set
      if (formData.name?.trim()) updatePayload.name = formData.name.trim()
      if (formData.email?.trim()) updatePayload.email = formData.email.trim()
      if (formData.avatar_url?.trim())
        updatePayload.avatar_url = formData.avatar_url.trim()
      if (formData.gender?.trim()) updatePayload.gender = formData.gender.trim()
      if (formData.pronouns?.trim())
        updatePayload.pronouns = formData.pronouns.trim()
      if (formData.dob?.trim()) updatePayload.dob = formData.dob.trim()
      if (formData.dod?.trim()) updatePayload.dod = formData.dod.trim()
      if (formData.birth_place?.trim())
        updatePayload.birth_place = formData.birth_place.trim()
      if (formData.death_place?.trim())
        updatePayload.death_place = formData.death_place.trim()
      if (formData.occupation?.trim())
        updatePayload.occupation = formData.occupation.trim()
      if (formData.bio?.trim()) updatePayload.bio = formData.bio.trim()
      if (formData.notes?.trim()) updatePayload.notes = formData.notes.trim()

      // Always include deceased status as it's a boolean
      updatePayload.deceased = formData.deceased

      // Validate required fields
      if (!updatePayload.name) {
        toast({
          title: 'Validation Error',
          description: 'Name is required',
          variant: 'destructive',
        })
        return
      }

      console.log('Sending member update payload:', updatePayload)

      const response = await fetch(`${baseUrl}/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        console.error('Member update failed:', response.status, errorData)
        throw new Error(
          errorData.message || `Failed to update member (${response.status})`,
        )
      }

      toast({
        title: 'Success',
        description: 'Member updated successfully',
      })
      onSuccess?.()
    } catch (error) {
      console.error('Error updating member:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update member',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Get potential parents (members not already parents, not descendants, not self)
  const potentialParents = allMembers.filter(
    (m) =>
      m.id !== member.id &&
      !selectedParents.includes(m.id) &&
      !member.childIds.includes(m.id), // Not a child of this member
  )

  // Get potential spouses (members not already spouses, not self, not parents/children)
  const potentialSpouses = allMembers.filter(
    (m) =>
      m.id !== member.id &&
      !selectedSpouses.includes(m.id) &&
      !member.parentIds.includes(m.id) &&
      !member.childIds.includes(m.id),
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit {member.name}</DialogTitle>
            <DialogDescription>
              Update member information and manage relationships
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4 flex-1 overflow-y-auto">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>

              {/* Avatar Upload */}
              <div className="flex justify-center py-4">
                <AvatarUpload
                  currentAvatarUrl={formData.avatar_url}
                  userInitials={member.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)}
                  onAvatarChange={(avatarUrl) => {
                    setFormData({ ...formData, avatar_url: avatarUrl || '' })
                    // Trigger immediate refresh of member data
                    onMemberUpdate?.()
                  }}
                  uploadEndpoint={`${
                    process.env.NEXT_PUBLIC_API_URL ||
                    'http://localhost:8050/api'
                  }/members/${member.id}/avatar`}
                  deleteEndpoint={`${
                    process.env.NEXT_PUBLIC_API_URL ||
                    'http://localhost:8050/api'
                  }/members/${member.id}/avatar`}
                  size="lg"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) =>
                      setFormData({ ...formData, gender: value })
                    }
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pronouns">Pronouns</Label>
                  <Input
                    id="pronouns"
                    value={formData.pronouns}
                    onChange={(e) =>
                      setFormData({ ...formData, pronouns: e.target.value })
                    }
                    placeholder="they/them, she/her, he/him"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) =>
                      setFormData({ ...formData, dob: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) =>
                      setFormData({ ...formData, occupation: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_place">Birth Place</Label>
                  <Input
                    id="birth_place"
                    value={formData.birth_place}
                    onChange={(e) =>
                      setFormData({ ...formData, birth_place: e.target.value })
                    }
                    placeholder="City, Country"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="deceased"
                  checked={formData.deceased}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, deceased: checked as boolean })
                  }
                />
                <Label htmlFor="deceased" className="cursor-pointer">
                  Deceased
                </Label>
              </div>

              {/* Death-related fields - only show if deceased */}
              {formData.deceased && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dod">Date of Death</Label>
                    <Input
                      id="dod"
                      type="date"
                      value={formData.dod}
                      onChange={(e) =>
                        setFormData({ ...formData, dod: e.target.value })
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="death_place">Death Place</Label>
                    <Input
                      id="death_place"
                      value={formData.death_place}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          death_place: e.target.value,
                        })
                      }
                      placeholder="City, Country"
                    />
                  </div>
                </div>
              )}

              {/* Bio and Notes */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bio">Biography</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                    placeholder="Brief biography or life story..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    placeholder="Additional notes or information..."
                    rows={3}
                  />
                </div>
              </div>

              <Button onClick={handleSaveBasicInfo} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Basic Info
              </Button>
            </div>

            <Separator />

            {/* Parents Management */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Parents</h3>
                <Badge variant="outline">
                  {selectedParents.length} /{' '}
                  {treeSettings.maxParentsPerChild || '∞'}
                </Badge>
              </div>

              {/* Current Parents */}
              <div className="space-y-2">
                {selectedParents.map((parentId) => {
                  const parent = allMembers.find((m) => m.id === parentId)
                  if (!parent) return null

                  return (
                    <div
                      key={parentId}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <span>{parent.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveParent(parentId)}
                      >
                        <UserMinus className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>

              {/* Add Parent */}
              {potentialParents.length > 0 && (
                <Select onValueChange={handleAddParent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add parent from tree..." />
                  </SelectTrigger>
                  <SelectContent>
                    {potentialParents.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <Separator />

            {/* Spouses Management */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Spouses</h3>
                <Badge variant="outline">
                  {selectedSpouses.length} /{' '}
                  {treeSettings.monogamy
                    ? '1'
                    : treeSettings.maxSpousesPerMember || '∞'}
                </Badge>
              </div>

              {/* Current Spouses */}
              <div className="space-y-2">
                {selectedSpouses.map((spouseId) => {
                  const spouse = allMembers.find((m) => m.id === spouseId)
                  if (!spouse) return null

                  return (
                    <div
                      key={spouseId}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <span>{spouse.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSpouse(spouseId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>

              {/* Add Existing Spouse */}
              {potentialSpouses.length > 0 && (
                <Select onValueChange={handleAddExistingSpouse}>
                  <SelectTrigger>
                    <SelectValue placeholder="Add existing member as spouse..." />
                  </SelectTrigger>
                  <SelectContent>
                    {potentialSpouses.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Add New Spouse */}
              <div className="rounded-md border p-4 space-y-3">
                <Label>Or add new spouse to tree</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Spouse name"
                    value={newSpouseName}
                    onChange={(e) => setNewSpouseName(e.target.value)}
                  />
                  <Select
                    value={newSpouseGender}
                    onValueChange={setNewSpouseGender}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button onClick={handleAddNewSpouse} disabled={loading}>
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Validation Warning Dialog */}
      <AlertDialog open={showWarningDialog} onOpenChange={setShowWarningDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Validation Warning
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p className="font-semibold">{validationWarning?.message}</p>
              <p className="text-sm">{validationWarning?.consequences}</p>
              <p className="text-sm font-medium mt-4">
                Do you want to proceed anyway?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowWarningDialog(false)
                setPendingAction(null)
                setValidationWarning(null)
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (pendingAction) {
                  await pendingAction()
                }
                setShowWarningDialog(false)
                setPendingAction(null)
                setValidationWarning(null)
              }}
            >
              Proceed Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
