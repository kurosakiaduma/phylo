'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DashboardLayout } from '@/components/dashboard-layout'
import { AvatarUpload } from '@/components/avatar-upload'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { getInitials } from '@/utils/profile-misc/get-initials'
import {
  Loader2,
  User,
  Info,
  Calendar,
  MapPin,
  Briefcase,
  Heart,
} from 'lucide-react'

interface Tree {
  id: string
  name: string
  description?: string
  role: string
  member_count?: number
  joined_at: string
}

export default function ProfilePage() {
  const { user, setUser } = useAuth()
  const { toast } = useToast()
  const [isUpdating, setIsUpdating] = useState(false)
  const [userTrees, setUserTrees] = useState<Tree[]>([])
  const [isLoadingTrees, setIsLoadingTrees] = useState(false)

  // Form state - Profile fields
  const [displayName, setDisplayName] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState('')
  const [pronouns, setPronouns] = useState('')
  const [bio, setBio] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050/api'

  // Load user data into form
  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '')
      setDob(user.dob || '')
      setGender(user.gender || '')
      setPronouns(user.pronouns || '')
      setBio(user.bio || '')
      setPhone(user.phone || '')
      setLocation(user.location || '')
    }
  }, [user])

  // Load user's trees and memberships
  useEffect(() => {
    const fetchUserTrees = async () => {
      if (!user) return

      setIsLoadingTrees(true)
      try {
        const response = await fetch(`${baseUrl}/trees`, {
          credentials: 'include',
        })

        if (response.ok) {
          const trees = await response.json()
          setUserTrees(trees)
        }
      } catch (error) {
        console.error('Error fetching user trees:', error)
      } finally {
        setIsLoadingTrees(false)
      }
    }

    fetchUserTrees()
  }, [user])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050/api'
      const response = await fetch(`${baseUrl}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          display_name: displayName || null,
          dob: dob || null,
          gender: gender || null,
          pronouns: pronouns || null,
          bio: bio || null,
          phone: phone || null,
          location: location || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update profile')
      }

      const updatedUser = await response.json()
      console.log('Profile update successful:', updatedUser)
      setUser(updatedUser)

      toast({
        title: 'Success',
        description: 'Profile updated successfully',
      })
    } catch (error) {
      console.error('Error updating profile:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAvatarChange = (avatarUrl: string | null) => {
    if (user) {
      setUser({
        ...user,
        avatar_url: avatarUrl,
      })
    }
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground">
            Manage your personal information and account settings
          </p>
        </div>

        <Separator />

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="profile">
              <User className="w-4 h-4 mr-2" />
              Profile Settings
            </TabsTrigger>
            <TabsTrigger value="info">
              <Info className="w-4 h-4 mr-2" />
              Public Information
            </TabsTrigger>
            <TabsTrigger value="trees">
              <Heart className="w-4 h-4 mr-2" />
              Family Trees
            </TabsTrigger>
          </TabsList>

          {/* Profile Settings Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Avatar & Basic Info</CardTitle>
                <CardDescription>
                  Update your avatar and display name
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Avatar</Label>
                  <AvatarUpload
                    currentAvatarUrl={user.avatar_url}
                    userInitials={getInitials(user.display_name, user.email)}
                    onAvatarChange={handleAvatarChange}
                  />
                </div>

                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={user.email}
                        disabled
                        className="bg-muted"
                      />
                      <p className="text-sm text-muted-foreground">
                        Email cannot be changed
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="displayName">Display Name *</Label>
                      <Input
                        id="displayName"
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Enter your display name"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="dob">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        Date of Birth
                      </Label>
                      <Input
                        id="dob"
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender</Label>
                      <Select value={gender} onValueChange={setGender}>
                        <SelectTrigger id="gender">
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="non-binary">Non-binary</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                          <SelectItem value="prefer-not-to-say">
                            Prefer not to say
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pronouns">
                      <Heart className="w-4 h-4 inline mr-1" />
                      Pronouns
                    </Label>
                    <Input
                      id="pronouns"
                      type="text"
                      value={pronouns}
                      onChange={(e) => setPronouns(e.target.value)}
                      placeholder="e.g., he/him, she/her, they/them"
                    />
                  </div>

                  <Separator />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Location
                      </Label>
                      <Input
                        id="location"
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City, Country"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">
                      <Briefcase className="w-4 h-4 inline mr-1" />
                      Bio
                    </Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Tell us about yourself..."
                      rows={4}
                    />
                    <p className="text-sm text-muted-foreground">
                      This information will be visible to other members in your
                      family trees
                    </p>
                  </div>

                  <Button type="submit" disabled={isUpdating}>
                    {isUpdating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update Profile'
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>View your account details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Account ID</Label>
                  <Input
                    value={user.id}
                    disabled
                    className="bg-muted font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Member Since</Label>
                  <Input
                    value={new Date(user.created_at).toLocaleDateString(
                      'en-US',
                      {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      },
                    )}
                    disabled
                    className="bg-muted"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Public Information Tab */}
          <TabsContent value="info" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Public Profile Preview</CardTitle>
                <CardDescription>
                  This is how other family tree members see your information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar and Name */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-semibold">
                      {user.avatar_url ? (
                        <img
                          src={`${baseUrl}${user.avatar_url}`}
                          alt={user.display_name || user.email}
                          className="w-20 h-20 rounded-full object-cover"
                        />
                      ) : (
                        getInitials(user.display_name, user.email)
                      )}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {user.display_name || 'No display name set'}
                    </h2>
                    {pronouns && (
                      <p className="text-sm text-muted-foreground">
                        ({pronouns})
                      </p>
                    )}
                  </div>
                </div>

                <Separator />

                {/* Personal Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  {dob && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">
                        Date of Birth
                      </Label>
                      <p className="font-medium">
                        {new Date(dob).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                  )}

                  {gender && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Gender</Label>
                      <p className="font-medium capitalize">
                        {gender.replace('-', ' ')}
                      </p>
                    </div>
                  )}

                  {phone && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">Phone</Label>
                      <p className="font-medium">{phone}</p>
                    </div>
                  )}

                  {location && (
                    <div className="space-y-1">
                      <Label className="text-muted-foreground">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Location
                      </Label>
                      <p className="font-medium">{location}</p>
                    </div>
                  )}
                </div>

                {bio && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <Label className="text-muted-foreground">Bio</Label>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {bio}
                      </p>
                    </div>
                  </>
                )}

                {!dob && !gender && !phone && !location && !bio && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Info className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No public information available</p>
                    <p className="text-sm">
                      Fill out your profile in the settings tab to display
                      information here
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Privacy Notice</CardTitle>
                <CardDescription>
                  Understanding your information visibility
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">
                      Visible to Family Tree Members
                    </p>
                    <p className="text-muted-foreground">
                      Your profile information is visible to members of family
                      trees you belong to
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Private by Default</p>
                    <p className="text-muted-foreground">
                      Your email and account ID are always private and never
                      shared with other users
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Control Your Information</p>
                    <p className="text-muted-foreground">
                      You can edit or remove any personal information at any
                      time from your profile settings
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Family Trees Tab */}
          <TabsContent value="trees" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Family Trees</CardTitle>
                <CardDescription>
                  Family trees you belong to and your role in each
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTrees ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">
                      Loading trees...
                    </span>
                  </div>
                ) : userTrees.length > 0 ? (
                  <div className="space-y-4">
                    {userTrees.map((tree) => (
                      <div
                        key={tree.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <h3 className="font-medium">{tree.name}</h3>
                          {tree.description && (
                            <p className="text-sm text-muted-foreground">
                              {tree.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>
                              Role:{' '}
                              <span className="capitalize font-medium">
                                {tree.role}
                              </span>
                            </span>
                            <span>Members: {tree.member_count || 0}</span>
                            <span>
                              Joined:{' '}
                              {new Date(tree.joined_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" asChild>
                          <a href={`/trees/${tree.id}`}>View Tree</a>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>You haven&apos;t joined any family trees yet</p>
                    <p className="text-sm">
                      Create a new tree or accept an invitation to get started
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Unified Identity System</CardTitle>
                <CardDescription>
                  How your identity is managed across the platform
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm">
                  <div className="flex gap-3">
                    <User className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Your Unique ID</p>
                      <p className="text-muted-foreground">
                        Your account has a unique identifier ({user?.id}) that
                        represents you across all family trees. This ensures
                        consistent identity and prevents duplicate records.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Automatic Synchronization</p>
                      <p className="text-muted-foreground">
                        When you update your profile information here, it
                        automatically syncs to your member records in all family
                        trees. Your avatar, name, demographics, and bio stay
                        consistent everywhere.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Invite Acceptance</p>
                      <p className="text-muted-foreground">
                        Whether you signed up first or were added as a member
                        first, the system automatically unifies your identity
                        when you accept invitations or verify your email.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Info className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Tree-Specific Information</p>
                      <p className="text-muted-foreground">
                        While your core identity is unified, relationships,
                        private notes, and tree-specific details remain unique
                        to each family tree and are managed by tree custodians.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
