/**
 * AddMemberDialog - Dialog for adding members directly from tree canvas
 * Supports adding self, parents, spouse, or children relative to existing members
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2 } from 'lucide-react'

interface AddMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  treeId: string
  relativeTo?: TreeMember // If provided, shows relationship options
  defaultRelationship?: RelationshipType // Pre-fill relationship type
  allMembers?: TreeMember[] // All members in tree (for spouse detection)
  onSuccess?: () => void
}

type RelationshipType = 'self' | 'parent' | 'spouse' | 'child'

export function AddMemberDialog({
  open,
  onOpenChange,
  treeId,
  relativeTo,
  defaultRelationship,
  allMembers = [],
  onSuccess,
}: AddMemberDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    gender: '',
    dob: '',
    deceased: false,
    relationship: defaultRelationship || ('self' as RelationshipType),
    includeSecondParent: false,
    selectedSecondParentId: '', // ID of selected spouse/co-parent
    becomeCoParent: false, // New: become co-parent to existing children
    selectedChildrenIds: [] as string[], // New: which children to become parent of
    useExistingMember: false, // New: use existing member instead of creating new
    selectedExistingMemberId: '', // New: ID of existing member to use
  })

  // Get spouses of the relativeTo member
  const relativeSpouses =
    relativeTo?.spouseIds
      ?.map((id) => allMembers.find((m) => m.id === id))
      .filter((m): m is TreeMember => m !== undefined) || []

  // Get children of the relativeTo member (for co-parent option)
  const relativeChildren =
    relativeTo?.childIds
      ?.map((id) => allMembers.find((m) => m.id === id))
      .filter((m): m is TreeMember => m !== undefined) || []

  // Show second parent option only when adding a child and relative has spouse(s)
  const showSecondParentOption =
    formData.relationship === 'child' && relativeSpouses.length > 0

  // Show co-parent option when adding spouse to someone with children
  const showCoParentOption =
    formData.relationship === 'spouse' && relativeChildren.length > 0

  // Get potential existing members for parent/spouse relationships
  const potentialExistingMembers = allMembers.filter((m) => {
    if (!relativeTo || m.id === relativeTo.id) return false

    if (formData.relationship === 'parent') {
      // For parents, exclude current children and descendants
      return (
        !relativeTo.childIds.includes(m.id) &&
        !m.childIds.includes(relativeTo.id)
      )
    } else if (formData.relationship === 'spouse') {
      // For spouses, exclude current spouses and family members
      return (
        !relativeTo.spouseIds.includes(m.id) &&
        !relativeTo.parentIds.includes(m.id) &&
        !relativeTo.childIds.includes(m.id)
      )
    }
    return true
  })

  // Show existing member option for parent and spouse relationships
  const showExistingMemberOption =
    (formData.relationship === 'parent' ||
      formData.relationship === 'spouse') &&
    potentialExistingMembers.length > 0

  // Auto-select first spouse if only one exists
  useEffect(() => {
    if (
      showSecondParentOption &&
      relativeSpouses.length === 1 &&
      !formData.selectedSecondParentId
    ) {
      setFormData((prev) => ({
        ...prev,
        selectedSecondParentId: relativeSpouses[0].id,
        includeSecondParent: true,
      }))
    }
  }, [showSecondParentOption, relativeSpouses])

  // Update relationship when defaultRelationship changes
  useEffect(() => {
    if (defaultRelationship) {
      setFormData((prev) => ({ ...prev, relationship: defaultRelationship }))
    }
  }, [defaultRelationship, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050/api'

      let targetMember: any

      if (formData.useExistingMember && formData.selectedExistingMemberId) {
        // Use existing member
        targetMember = { id: formData.selectedExistingMemberId }
      } else {
        // Create new member
        const memberPayload = {
          name: formData.name,
          email: formData.email || undefined,
          gender: formData.gender || undefined,
          dob: formData.dob || undefined,
          deceased: formData.deceased,
        }

        const memberResponse = await fetch(
          `${baseUrl}/trees/${treeId}/members`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(memberPayload),
          },
        )

        if (!memberResponse.ok) {
          throw new Error('Failed to create member')
        }

        targetMember = await memberResponse.json()
      }

      // If there's a relative, create the relationship
      if (relativeTo && formData.relationship !== 'self') {
        let relationshipUrl = ''

        switch (formData.relationship) {
          case 'parent':
            // Add parent-child relationship (targetMember is parent, relativeTo is child)
            relationshipUrl = `${baseUrl}/members/${targetMember.id}/children?child_id=${relativeTo.id}`
            console.log(
              `[AddMember] Adding parent ${
                formData.useExistingMember
                  ? 'existing member'
                  : targetMember.name || formData.name
              } to child ${relativeTo.name}`,
            )
            break

          case 'child':
            // New member is child of relativeTo
            // Check if we should add second parent (spouse)
            if (showSecondParentOption && formData.includeSecondParent) {
              // Validate that second parent is selected
              if (!formData.selectedSecondParentId) {
                throw new Error(
                  'Please select a second parent or uncheck "Add second parent"',
                )
              }
              // Add child with both parents
              relationshipUrl = `${baseUrl}/members/${relativeTo.id}/children?child_id=${targetMember.id}&second_parent_id=${formData.selectedSecondParentId}`
            } else {
              // Single parent only
              relationshipUrl = `${baseUrl}/members/${relativeTo.id}/children?child_id=${targetMember.id}`
            }
            break

          case 'spouse':
            // New member is spouse of relativeTo
            relationshipUrl = `${baseUrl}/members/${relativeTo.id}/spouse?spouse_id=${targetMember.id}`
            break
        }

        if (relationshipUrl) {
          const relResponse = await fetch(relationshipUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
          })

          if (!relResponse.ok) {
            const errorData = await relResponse.json().catch(() => null)
            console.error('Failed to create relationship:', errorData)
            throw new Error(
              `Failed to create relationship: ${
                errorData?.detail || relResponse.statusText
              }`,
            )
          }
        }

        // Handle co-parent relationships for spouse
        if (
          formData.relationship === 'spouse' &&
          formData.becomeCoParent &&
          formData.selectedChildrenIds.length > 0
        ) {
          for (const childId of formData.selectedChildrenIds) {
            const coParentUrl = `${baseUrl}/members/${targetMember.id}/children?child_id=${childId}`

            const coParentResponse = await fetch(coParentUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
            })

            if (!coParentResponse.ok) {
              const errorData = await coParentResponse.json().catch(() => null)
              console.error(
                'Failed to create co-parent relationship:',
                errorData,
              )
              // Don't throw error here - spouse relationship was successful, co-parent is bonus
              console.warn(
                `Could not add co-parent relationship with child ${childId}: ${
                  errorData?.detail || coParentResponse.statusText
                }`,
              )
            }
          }
        }
      }

      // Reset form and close
      setFormData({
        name: '',
        email: '',
        gender: '',
        dob: '',
        deceased: false,
        relationship: 'self',
        includeSecondParent: false,
        selectedSecondParentId: '',
        becomeCoParent: false,
        selectedChildrenIds: [],
        useExistingMember: false,
        selectedExistingMemberId: '',
      })
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Error adding member:', error)
      alert('Failed to add member. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const getDialogTitle = () => {
    if (!relativeTo) return 'Add First Member'

    const action = formData.useExistingMember ? 'Connect' : 'Add'

    switch (formData.relationship) {
      case 'parent':
        return `${action} Parent ${formData.useExistingMember ? 'to' : 'of'} ${
          relativeTo.name
        }`
      case 'child':
        return `${action} Child ${formData.useExistingMember ? 'to' : 'of'} ${
          relativeTo.name
        }`
      case 'spouse':
        return `${action} Spouse ${formData.useExistingMember ? 'to' : 'of'} ${
          relativeTo.name
        }`
      default:
        return 'Add Family Member'
    }
  }

  const getDialogDescription = () => {
    if (!relativeTo) {
      return 'Add yourself or the oldest known ancestor to start your family tree'
    }

    if (formData.useExistingMember) {
      return `Select an existing family member to create a ${formData.relationship} relationship`
    }

    return 'Fill in the details to add a new family member'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{getDialogTitle()}</DialogTitle>
            <DialogDescription>{getDialogDescription()}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Relationship Type (if relative exists) */}
            {relativeTo && (
              <div className="space-y-2">
                <Label htmlFor="relationship">
                  Relationship to {relativeTo.name}
                </Label>
                <Select
                  value={formData.relationship}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      relationship: value as RelationshipType,
                      useExistingMember: false,
                      selectedExistingMemberId: '',
                    })
                  }
                >
                  <SelectTrigger id="relationship">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="spouse">Spouse</SelectItem>
                    <SelectItem value="child">Child</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Existing Member Option */}
            {showExistingMemberOption && (
              <div className="space-y-3 rounded-md border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="useExistingMember"
                    checked={formData.useExistingMember}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        useExistingMember: checked as boolean,
                        selectedExistingMemberId: '',
                      })
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="useExistingMember"
                      className="cursor-pointer text-sm font-medium"
                    >
                      Use existing family member
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select someone already in the tree instead of creating a
                      new member
                    </p>
                  </div>
                </div>

                {/* Existing Member Selection */}
                {formData.useExistingMember && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="existingMember" className="text-sm">
                      Select Existing Member
                    </Label>
                    <Select
                      value={formData.selectedExistingMemberId}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          selectedExistingMemberId: value,
                        })
                      }
                    >
                      <SelectTrigger id="existingMember">
                        <SelectValue placeholder="Choose existing member..." />
                      </SelectTrigger>
                      <SelectContent>
                        {potentialExistingMembers.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}{' '}
                            {member.gender ? `(${member.gender})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This will create a {formData.relationship} relationship
                      with the selected member
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Co-Parent Warning (when adding parent to someone who already has parents) */}
            {relativeTo &&
              formData.relationship === 'parent' &&
              relativeTo.parentIds &&
              relativeTo.parentIds.length > 0 && (
                <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                  <div className="flex items-start space-x-2">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Adding Co-Parent
                      </h4>
                      <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                        {relativeTo.name} already has{' '}
                        {relativeTo.parentIds.length} parent
                        {relativeTo.parentIds.length > 1 ? 's' : ''}. The new
                        parent will be placed in the same generation as the
                        existing parent
                        {relativeTo.parentIds.length > 1 ? 's' : ''}
                        to maintain proper family tree structure.
                      </p>
                      <div className="mt-2">
                        <p className="text-xs font-medium text-amber-800 dark:text-amber-200">
                          Existing parent
                          {relativeTo.parentIds.length > 1 ? 's' : ''}:
                        </p>
                        <ul className="text-xs text-amber-700 dark:text-amber-300 ml-2">
                          {relativeTo.parentIds.map((parentId) => {
                            const parent = allMembers.find(
                              (m) => m.id === parentId,
                            )
                            return (
                              <li key={parentId}>
                                • {parent?.name || 'Unknown'}
                              </li>
                            )
                          })}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Second Parent Option (only shown when adding child and relative has spouse) */}
            {showSecondParentOption && (
              <div className="space-y-3 rounded-md border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="includeSecondParent"
                    checked={formData.includeSecondParent}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        includeSecondParent: checked as boolean,
                      })
                    }
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="includeSecondParent"
                      className="cursor-pointer text-sm font-medium"
                    >
                      Add second parent
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Select which spouse/partner will be the other parent
                    </p>
                  </div>
                </div>

                {/* Second Parent Selection */}
                {formData.includeSecondParent && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="secondParent" className="text-sm">
                      Second Parent
                    </Label>
                    <Select
                      value={formData.selectedSecondParentId}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          selectedSecondParentId: value,
                        })
                      }
                    >
                      <SelectTrigger id="secondParent">
                        <SelectValue placeholder="Select second parent" />
                      </SelectTrigger>
                      <SelectContent>
                        {relativeSpouses.map((spouse) => (
                          <SelectItem key={spouse.id} value={spouse.id}>
                            {spouse.name}{' '}
                            {spouse.gender ? `(${spouse.gender})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      This will create parent-child relationships with both{' '}
                      {relativeTo?.name} and the selected parent
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Co-Parent Option (only shown when adding spouse to someone with children) */}
            {showCoParentOption && (
              <div className="space-y-3 rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="becomeCoParent"
                    checked={formData.becomeCoParent}
                    onCheckedChange={(checked) => {
                      const isChecked = checked as boolean
                      setFormData({
                        ...formData,
                        becomeCoParent: isChecked,
                        selectedChildrenIds: isChecked
                          ? relativeChildren.map((c) => c.id)
                          : [],
                      })
                    }}
                  />
                  <div className="flex-1">
                    <Label
                      htmlFor="becomeCoParent"
                      className="cursor-pointer text-sm font-medium"
                    >
                      Become co-parent to existing children
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Add this spouse as a parent to {relativeTo?.name}'s
                      existing children
                    </p>
                  </div>
                </div>

                {/* Children Selection */}
                {formData.becomeCoParent && (
                  <div className="space-y-2 pl-6">
                    <Label className="text-sm">
                      Children to become parent of:
                    </Label>
                    <div className="space-y-2">
                      {relativeChildren.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`child-${child.id}`}
                            checked={formData.selectedChildrenIds.includes(
                              child.id,
                            )}
                            onCheckedChange={(checked) => {
                              const newSelectedIds = checked
                                ? [...formData.selectedChildrenIds, child.id]
                                : formData.selectedChildrenIds.filter(
                                    (id) => id !== child.id,
                                  )
                              setFormData({
                                ...formData,
                                selectedChildrenIds: newSelectedIds,
                              })
                            }}
                          />
                          <Label
                            htmlFor={`child-${child.id}`}
                            className="cursor-pointer text-sm"
                          >
                            {child.name}{' '}
                            {child.gender ? `(${child.gender})` : ''}
                          </Label>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This will create parent-child relationships between the
                      new spouse and selected children
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Name - only show if not using existing member */}
            {!formData.useExistingMember && (
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  placeholder="Full name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
            )}

            {/* Only show member details if not using existing member */}
            {!formData.useExistingMember && (
              <>
                {/* Gender */}
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
                      <SelectItem value="unspecified">
                        Prefer not to say
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Date of Birth */}
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

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email (optional)</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                {/* Deceased */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="deceased"
                    checked={formData.deceased}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, deceased: checked as boolean })
                    }
                  />
                  <Label
                    htmlFor="deceased"
                    className="cursor-pointer text-sm font-normal"
                  >
                    Deceased
                  </Label>
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                loading ||
                (!formData.useExistingMember && !formData.name.trim()) ||
                (formData.useExistingMember &&
                  !formData.selectedExistingMemberId)
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formData.useExistingMember ? 'Add Relationship' : 'Add Member'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
