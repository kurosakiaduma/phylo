'use client'

import { useState } from 'react'
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
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react'

interface MemberFormData {
  name: string
  email: string
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

export default function NewMemberPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const treeId = params.id as string

  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    email: '',
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

      // Prepare payload (only include non-empty fields)
      const payload: Partial<MemberFormData> = {
        name: formData.name.trim(),
      }

      if (formData.email) payload.email = formData.email
      if (formData.gender) payload.gender = formData.gender
      if (formData.dob) payload.dob = formData.dob
      if (formData.dod) payload.dod = formData.dod
      if (formData.deceased) payload.deceased = formData.deceased
      if (formData.birth_place) payload.birth_place = formData.birth_place
      if (formData.death_place) payload.death_place = formData.death_place
      if (formData.occupation) payload.occupation = formData.occupation
      if (formData.pronouns) payload.pronouns = formData.pronouns
      if (formData.bio) payload.bio = formData.bio
      if (formData.notes) payload.notes = formData.notes

      const response = await fetch(`${baseUrl}/trees/${treeId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create member')
      }

      await response.json() // Member created successfully

      toast({
        title: 'Success',
        description: `${formData.name} has been added to your family tree`,
      })

      // Redirect to tree view or members list
      router.push(`/trees/${treeId}`)
    } catch (error) {
      console.error('Error creating member:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to create member',
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
          <h1 className="text-3xl font-bold tracking-tight">
            Add Family Member
          </h1>
          <p className="text-muted-foreground">
            Add a new person to your family tree
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle>Member Information</CardTitle>
              <CardDescription>
                Enter the details of the family member. Only name is required.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="font-medium">Basic Information</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      placeholder="John Doe"
                      required
                    />
                  </div>

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
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender</Label>
                    <Select
                      value={formData.gender}
                      onValueChange={(v) => handleChange('gender', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="unspecified">Unspecified</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pronouns">Pronouns</Label>
                    <Input
                      id="pronouns"
                      value={formData.pronouns}
                      onChange={(e) => handleChange('pronouns', e.target.value)}
                      placeholder="they/them, he/him, she/her"
                    />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="font-medium">Dates</h3>

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

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="deceased"
                    checked={formData.deceased}
                    onCheckedChange={(checked) =>
                      handleChange('deceased', !!checked)
                    }
                  />
                  <Label htmlFor="deceased" className="cursor-pointer">
                    This person is deceased
                  </Label>
                </div>

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
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <h3 className="font-medium">Additional Information</h3>

                <div className="space-y-2">
                  <Label htmlFor="occupation">Occupation</Label>
                  <Input
                    id="occupation"
                    value={formData.occupation}
                    onChange={(e) => handleChange('occupation', e.target.value)}
                    placeholder="Software Engineer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Biography</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleChange('bio', e.target.value)}
                    placeholder="Brief biography or description..."
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Private Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    placeholder="Private notes (only visible to custodians)..."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    These notes are private and only visible to tree custodians
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 border-t pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add Member
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </DashboardLayout>
  )
}
