'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
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
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, Loader2, Save } from 'lucide-react'
import { AvatarUpload } from '@/components/avatar-upload'

interface MemberFormData {
  name: string
  email: string
  avatar_url: string
  gender: string
  dob: string
  dod: string
  deceased: boolean
  birth_place: string
  death_place: string
  occupation: string
  pronouns: string
  bio: string
  notes: string
}

export default function EditMemberPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const treeId = params.id as string
  const memberId = params.memberId as string

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    email: '',
    avatar_url: '',
    gender: '',
    dob: '',
    dod: '',
    deceased: false,
    birth_place: '',
    death_place: '',
    occupation: '',
    pronouns: '',
    bio: '',
    notes: '',
  })

  useEffect(() => {
    fetchMember()
  }, [memberId])

  const fetchMember = async () => {
    try {
      setFetching(true)
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050/api'
      const response = await fetch(`${baseUrl}/members/${memberId}`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch member')
      }

      const member = await response.json()

      // Populate form with existing data
      setFormData({
        name: member.name || '',
        email: member.email || '',
        avatar_url: member.avatar_url || '',
        gender: member.gender || '',
        dob: member.dob || '',
        dod: member.dod || '',
        deceased: member.deceased || false,
        birth_place: member.birth_place || '',
        death_place: member.death_place || '',
        occupation: member.occupation || '',
        pronouns: member.pronouns || '',
        bio: member.bio || '',
        notes: member.notes || '',
      })
    } catch (error) {
      console.error('Error fetching member:', error)
      toast({
        title: 'Error',
        description: 'Failed to load member details',
        variant: 'destructive',
      })
      router.back()
    } finally {
      setFetching(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a name',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050/api'

      // Prepare payload (only include changed fields)
      const payload: Partial<MemberFormData> = {
        name: formData.name.trim(),
      }

      if (formData.email) payload.email = formData.email
      if (formData.avatar_url) payload.avatar_url = formData.avatar_url
      if (formData.gender) payload.gender = formData.gender
      if (formData.dob) payload.dob = formData.dob
      if (formData.dod) payload.dod = formData.dod
      payload.deceased = formData.deceased
      if (formData.birth_place) payload.birth_place = formData.birth_place
      if (formData.death_place) payload.death_place = formData.death_place
      if (formData.occupation) payload.occupation = formData.occupation
      if (formData.pronouns) payload.pronouns = formData.pronouns
      if (formData.bio) payload.bio = formData.bio
      if (formData.notes) payload.notes = formData.notes

      const response = await fetch(`${baseUrl}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update member')
      }

      await response.json() // Member updated successfully

      toast({
        title: 'Success',
        description: `${formData.name} has been updated`,
      })

      // Redirect back to tree view
      router.push(`/trees/${treeId}`)
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

  const handleChange = (
    field: keyof MemberFormData,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (fetching) {
    return (
      <DashboardLayout>
        <div className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading member details...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl space-y-6">
        {/* Header */}
        <div>
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Edit Member</h1>
          <p className="text-muted-foreground">
            Update information for {formData.name}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Member Information</CardTitle>
              <CardDescription>
                Update the details for this family member
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  placeholder="John Doe"
                  required
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  placeholder="john@example.com"
                />
              </div>

              {/* Avatar Upload */}
              <div className="space-y-2">
                <Label>Profile Picture</Label>
                <div className="flex justify-center py-4">
                  <AvatarUpload
                    currentAvatarUrl={formData.avatar_url}
                    userInitials={formData.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                    onAvatarChange={(avatarUrl) => {
                      handleChange('avatar_url', avatarUrl || '')
                      // Refetch member data to get the latest avatar URL
                      fetchMember()
                    }}
                    uploadEndpoint={`${
                      process.env.NEXT_PUBLIC_API_URL ||
                      'http://localhost:8050/api'
                    }/members/${memberId}/avatar`}
                    deleteEndpoint={`${
                      process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050'
                    }/members/${memberId}/avatar`}
                    size="lg"
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Upload a profile picture for this family member
                </p>
              </div>

              {/* Gender & Pronouns Row */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => handleChange('gender', value)}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="unspecified">
                        Prefer not to say
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pronouns">Pronouns</Label>
                  <Input
                    id="pronouns"
                    value={formData.pronouns}
                    onChange={(e) => handleChange('pronouns', e.target.value)}
                    placeholder="he/him, she/her, they/them"
                  />
                </div>
              </div>

              {/* Birth Date & Place */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    value={formData.dob}
                    onChange={(e) => handleChange('dob', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="birth_place">Birth Place</Label>
                  <Input
                    id="birth_place"
                    value={formData.birth_place}
                    onChange={(e) =>
                      handleChange('birth_place', e.target.value)
                    }
                    placeholder="City, Country"
                  />
                </div>
              </div>

              {/* Deceased Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="deceased"
                  checked={formData.deceased}
                  onCheckedChange={(checked) =>
                    handleChange('deceased', checked as boolean)
                  }
                />
                <Label
                  htmlFor="deceased"
                  className="cursor-pointer text-sm font-normal"
                >
                  Deceased
                </Label>
              </div>

              {/* Death Date & Place (shown if deceased) */}
              {formData.deceased && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dod">Date of Death</Label>
                    <Input
                      id="dod"
                      type="date"
                      value={formData.dod}
                      onChange={(e) => handleChange('dod', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="death_place">Death Place</Label>
                    <Input
                      id="death_place"
                      value={formData.death_place}
                      onChange={(e) =>
                        handleChange('death_place', e.target.value)
                      }
                      placeholder="City, Country"
                    />
                  </div>
                </div>
              )}

              {/* Occupation */}
              <div className="space-y-2">
                <Label htmlFor="occupation">Occupation</Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => handleChange('occupation', e.target.value)}
                  placeholder="Software Engineer, Teacher, etc."
                />
              </div>

              {/* Biography */}
              <div className="space-y-2">
                <Label htmlFor="bio">Biography</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  placeholder="Tell their story..."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Public information visible to all tree members
                </p>
              </div>

              {/* Private Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Private Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleChange('notes', e.target.value)}
                  placeholder="Private notes (custodian only)..."
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  Only visible to tree custodians
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  )
}
