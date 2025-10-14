'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useToast } from '@/hooks/use-toast'
import { useTreeMembers } from '@/hooks/use-tree-members'
import { ArrowLeft, Image, Upload, Loader2, Users, Camera } from 'lucide-react'

interface Tree {
  id: string
  name: string
  description?: string
  role: 'custodian' | 'contributor' | 'viewer'
}

interface GalleryItem {
  id: string
  member_id: string
  member_name: string
  image_url: string
  caption?: string
  uploaded_by: string
  uploaded_at: string
  type: 'avatar' | 'photo'
}

export default function GalleryPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [tree, setTree] = useState<Tree | null>(null)
  const [galleryItems, setGalleryItems] = useState<GalleryItem[]>([])
  const [loading, setLoading] = useState(true)

  const treeId = params.id as string

  // Fetch tree members for gallery generation
  const { members } = useTreeMembers({ treeId, autoFetch: true })

  useEffect(() => {
    fetchTreeAndGallery()
  }, [treeId])

  const fetchTreeAndGallery = async () => {
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

      // Generate gallery from member avatars
      generateGalleryFromMembers()
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load gallery. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const generateGalleryFromMembers = () => {
    const generatedItems: GalleryItem[] = []

    members.forEach((member) => {
      // Add member avatars to gallery
      if (member.avatar_url) {
        generatedItems.push({
          id: `avatar-${member.id}`,
          member_id: member.id,
          member_name: member.name,
          image_url: member.avatar_url,
          caption: `${member.name}'s profile photo`,
          uploaded_by: 'System',
          uploaded_at: member.updated_at || member.created_at,
          type: 'avatar',
        })
      }
    })

    // Sort by upload date (newest first)
    generatedItems.sort(
      (a, b) =>
        new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime(),
    )

    setGalleryItems(generatedItems)
  }

  useEffect(() => {
    if (members.length > 0) {
      generateGalleryFromMembers()
    }
  }, [members])

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading gallery...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!tree) {
    return null
  }

  const canUpload = tree.role === 'custodian' || tree.role === 'contributor'

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              onClick={() => router.push(`/trees/${treeId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tree
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Family Gallery
              </h1>
              <p className="text-muted-foreground">
                {tree.name} • {galleryItems.length} photos
              </p>
            </div>
          </div>

          {canUpload && (
            <Button disabled>
              <Upload className="h-4 w-4 mr-2" />
              Upload Photo
              <Badge variant="secondary" className="ml-2">
                Coming Soon
              </Badge>
            </Button>
          )}
        </div>

        {/* Gallery Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Family Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {galleryItems.length === 0 ? (
              <div className="text-center py-12">
                <Camera className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Photos Yet</h3>
                <p className="text-muted-foreground mb-4">
                  The gallery shows profile photos from family members. Add
                  profile photos to members to see them here.
                </p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => router.push(`/trees/${treeId}/members`)}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Manage Members
                  </Button>
                  {canUpload && (
                    <Button variant="outline" disabled>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Photos
                      <Badge variant="secondary" className="ml-2">
                        Soon
                      </Badge>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {galleryItems.map((item) => (
                  <div
                    key={item.id}
                    className="group relative aspect-square overflow-hidden rounded-lg border bg-muted hover:shadow-md transition-shadow"
                  >
                    <img
                      src={`${
                        process.env.NEXT_PUBLIC_BACKEND_URL ||
                        'http://localhost:8050'
                      }${item.image_url}`}
                      alt={item.caption || item.member_name}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />

                    {/* Overlay with member info */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors">
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={`${
                                process.env.NEXT_PUBLIC_BACKEND_URL ||
                                'http://localhost:8050'
                              }${item.image_url}`}
                              alt={item.member_name}
                            />
                            <AvatarFallback className="text-xs">
                              {getInitials(item.member_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium truncate">
                              {item.member_name}
                            </p>
                            <p className="text-xs text-white/80">
                              {item.type === 'avatar'
                                ? 'Profile Photo'
                                : 'Family Photo'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Type badge */}
                    <div className="absolute top-2 right-2">
                      <Badge
                        variant={
                          item.type === 'avatar' ? 'default' : 'secondary'
                        }
                        className="text-xs"
                      >
                        {item.type === 'avatar' ? 'Profile' : 'Photo'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gallery Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{galleryItems.length}</div>
              <p className="text-xs text-muted-foreground">Photos in gallery</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Profile Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {galleryItems.filter((item) => item.type === 'avatar').length}
              </div>
              <p className="text-xs text-muted-foreground">Member avatars</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Members with Photos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(galleryItems.map((item) => item.member_id)).size}
              </div>
              <p className="text-xs text-muted-foreground">
                Out of {members.length} total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Coverage</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.length > 0
                  ? Math.round(
                      (new Set(galleryItems.map((item) => item.member_id))
                        .size /
                        members.length) *
                        100,
                    )
                  : 0}
                %
              </div>
              <p className="text-xs text-muted-foreground">
                Members with photos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Future Features Notice */}
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center">
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-2">
                More Gallery Features Coming Soon
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                We&apos;re working on adding photo uploads, albums, and more gallery
                features. Currently showing profile photos from family members.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge variant="outline">Photo Upload</Badge>
                <Badge variant="outline">Photo Albums</Badge>
                <Badge variant="outline">Photo Tagging</Badge>
                <Badge variant="outline">Photo Comments</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
