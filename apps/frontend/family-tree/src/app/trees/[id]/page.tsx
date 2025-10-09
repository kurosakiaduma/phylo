'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useToast } from '@/hooks/use-toast'
import { TreeCanvas } from '@/components/TreeCanvas'
import { MemberDrawer } from '@/components/MemberDrawer'
import { AddMemberDialog } from '@/components/AddMemberDialog'
import { EditMemberDialog } from '@/components/EditMemberDialog'
import { useTreeMembers } from '@/hooks/use-tree-members'
import { TreeMember } from '@/types/member'
import {
  TreePine,
  Settings,
  Users,
  UserPlus,
  Loader2,
  Network,
  Info,
} from 'lucide-react'
import { useTreeKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

interface Tree {
  id: string
  name: string
  description?: string
  settings: any
  created_by: string
  created_at: string
  user_role: 'custodian' | 'contributor' | 'viewer'
  member_count: number
}

export default function TreeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [tree, setTree] = useState<Tree | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMember, setSelectedMember] = useState<TreeMember | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [addMemberDialogOpen, setAddMemberDialogOpen] = useState(false)
  const [editMemberDialogOpen, setEditMemberDialogOpen] = useState(false)
  const [addMemberRelativeTo, setAddMemberRelativeTo] = useState<
    TreeMember | undefined
  >(undefined)
  const [addMemberRelationshipType, setAddMemberRelationshipType] = useState<
    'parent' | 'spouse' | 'child' | undefined
  >(undefined)
  const [isCanvasFullscreen, setIsCanvasFullscreen] = useState(false)
  const [relationshipAnalyzerOpen, setRelationshipAnalyzerOpen] =
    useState(false)
  const [relationshipAnalyzerMembers, setRelationshipAnalyzerMembers] =
    useState<{
      fromMemberId: string
      toMemberId: string
    } | null>(null)

  const treeId = params.id as string

  // Setup tree-specific keyboard shortcuts
  useTreeKeyboardShortcuts(treeId)

  // Fetch tree members
  const {
    members,
    loading: membersLoading,
    error: membersError,
    refetch: refetchMembers,
  } = useTreeMembers({ treeId, autoFetch: true })

  useEffect(() => {
    fetchTree()
  }, [treeId])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsCanvasFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const fetchTree = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trees/${treeId}`,
        {
          credentials: 'include',
        },
      )

      if (!response.ok) {
        if (response.status === 404) {
          toast({
            title: 'Tree Not Found',
            description:
              'The requested tree does not exist or you do not have access to it.',
            variant: 'destructive',
          })
          router.push('/trees')
          return
        }
        throw new Error('Failed to fetch tree')
      }

      const data = await response.json()
      setTree(data)
    } catch (error) {
      console.error('Error fetching tree:', error)
      toast({
        title: 'Error',
        description: 'Failed to load tree details. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading tree...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!tree) {
    return null
  }

  const isCustodian = tree.user_role === 'custodian'
  const canEdit =
    tree.user_role === 'custodian' || tree.user_role === 'contributor'

  const handleMemberClick = (member: TreeMember) => {
    setSelectedMember(member)
    setDrawerOpen(true)
  }

  const handleCenterOnMember = (memberId: string) => {
    const member = members.find((m) => m.id === memberId)
    if (member) {
      setSelectedMember(member)
    }
  }

  const handleAddMember = (
    relativeTo?: TreeMember,
    relationshipType?: 'parent' | 'spouse' | 'child',
  ) => {
    setAddMemberRelativeTo(relativeTo)
    setAddMemberRelationshipType(relationshipType)
    setAddMemberDialogOpen(true)
  }

  const handleAddMemberSuccess = () => {
    refetchMembers()
    toast({
      title: 'Success',
      description: 'Family member added successfully',
    })
  }

  const handleRelationshipAnalyze = (
    fromMemberId: string,
    toMemberId: string,
  ) => {
    setRelationshipAnalyzerMembers({ fromMemberId, toMemberId })
    setRelationshipAnalyzerOpen(true)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{tree.name}</h1>
              <Badge
                variant={
                  tree.user_role === 'custodian'
                    ? 'default'
                    : tree.user_role === 'contributor'
                    ? 'secondary'
                    : 'outline'
                }
              >
                {tree.user_role}
              </Badge>
            </div>
            {tree.description && (
              <p className="text-muted-foreground">{tree.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {canEdit && (
              <Button variant="outline" onClick={() => handleAddMember()}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Member
              </Button>
            )}
            {isCustodian && (
              <Button
                variant="outline"
                onClick={() => router.push(`/trees/${treeId}/settings`)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            )}
          </div>
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="visualization" className="space-y-4">
          <TabsList>
            <TabsTrigger value="visualization">
              <Network className="h-4 w-4 mr-2" />
              Tree View
            </TabsTrigger>
            <TabsTrigger value="members">
              <Users className="h-4 w-4 mr-2" />
              Members ({members.length})
            </TabsTrigger>
            <TabsTrigger value="info">
              <Info className="h-4 w-4 mr-2" />
              Information
            </TabsTrigger>
          </TabsList>

          <TabsContent value="visualization" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Family Tree Visualization</CardTitle>
                <CardDescription>
                  Interactive view of your family tree with all members and
                  relationships. Click and drag to pan, scroll to zoom, click
                  members to view details.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {membersLoading ? (
                  <div className="flex h-[600px] items-center justify-center">
                    <div className="text-center">
                      <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
                      <p className="text-muted-foreground">
                        Loading family tree...
                      </p>
                    </div>
                  </div>
                ) : membersError ? (
                  <div className="flex h-[600px] items-center justify-center">
                    <div className="text-center">
                      <TreePine className="mx-auto mb-4 h-16 w-16 text-destructive" />
                      <h3 className="mb-2 text-xl font-semibold">
                        Error Loading Tree
                      </h3>
                      <p className="mb-6 text-muted-foreground">
                        {membersError.message}
                      </p>
                      <Button onClick={() => refetchMembers()}>
                        Try Again
                      </Button>
                    </div>
                  </div>
                ) : members.length === 0 ? (
                  <div className="relative flex h-[600px] items-center justify-center border-2 border-dashed">
                    <div className="text-center">
                      <TreePine className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                      <h3 className="mb-2 text-xl font-semibold">
                        Start Building Your Family Tree
                      </h3>
                      <p className="mb-6 max-w-md text-muted-foreground">
                        Add yourself as the first member to begin creating your
                        tree. You can then add parents, spouses, children, and
                        siblings to build out your family history.
                      </p>
                      {canEdit && (
                        <div className="flex flex-col items-center gap-3">
                          <Button onClick={() => handleAddMember()} size="lg">
                            <UserPlus className="mr-2 h-5 w-5" />
                            Add Yourself
                          </Button>
                          <p className="text-xs text-muted-foreground">
                            You'll be the root of this family tree
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="relative h-[600px] w-full">
                    <TreeCanvas
                      members={members}
                      selectedMemberId={selectedMember?.id}
                      onMemberClick={handleMemberClick}
                      onCenterOnMember={handleCenterOnMember}
                      treeId={treeId}
                      selectedMember={selectedMember}
                      drawerOpen={drawerOpen}
                      onDrawerOpenChange={setDrawerOpen}
                      onEditClick={() => {
                        setDrawerOpen(false)
                        setEditMemberDialogOpen(true)
                      }}
                      onAddSpouseClick={() => {
                        setDrawerOpen(false)
                        handleAddMember(selectedMember || undefined, 'spouse')
                      }}
                      onAddChildClick={() => {
                        setDrawerOpen(false)
                        handleAddMember(selectedMember || undefined, 'child')
                      }}
                      onAddParentClick={() => {
                        setDrawerOpen(false)
                        handleAddMember(selectedMember || undefined, 'parent')
                      }}
                      onMemberNavigate={(member) => {
                        setSelectedMember(member)
                        handleCenterOnMember(member.id)
                      }}
                    />

                    {/* Floating Add Member Button */}
                    {canEdit && (
                      <div className="absolute bottom-4 left-4 z-10">
                        <Button
                          onClick={() => handleAddMember()}
                          size="lg"
                          className="shadow-lg"
                        >
                          <UserPlus className="mr-2 h-5 w-5" />
                          Add Member
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Family Members</CardTitle>
                <CardDescription>
                  Browse and manage all members in this family tree
                </CardDescription>
              </CardHeader>
              <CardContent>
                {membersLoading ? (
                  <div className="flex h-[200px] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : members.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-12 text-center">
                    <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      No Members Yet
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Start by adding family members to build your tree
                    </p>
                    {canEdit && (
                      <Button
                        onClick={() =>
                          router.push(`/trees/${treeId}/members/new`)
                        }
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add Member
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {members.length} member{members.length !== 1 ? 's' : ''}{' '}
                        in this tree
                      </p>
                      <div className="flex gap-2">
                        {members.length >= 2 && (
                          <Button
                            variant="outline"
                            onClick={() =>
                              router.push(`/trees/${treeId}/relationships`)
                            }
                          >
                            <Network className="h-4 w-4 mr-2" />
                            Analyze Relationships
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          onClick={() =>
                            router.push(`/trees/${treeId}/members`)
                          }
                        >
                          View All Members
                        </Button>
                      </div>
                    </div>

                    {/* Show first 6 members */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                      {members.slice(0, 6).map((member) => (
                        <Card
                          key={member.id}
                          className="cursor-pointer hover:border-primary/50"
                          onClick={() => {
                            setSelectedMember(member)
                            setDrawerOpen(true)
                          }}
                        >
                          <CardContent className="p-3">
                            <div className="flex flex-col items-center gap-2 text-center">
                              <Avatar className="h-12 w-12">
                                <AvatarImage
                                  src={
                                    member.avatar_url
                                      ? `${
                                          process.env.NEXT_PUBLIC_BACKEND_URL ||
                                          'http://localhost:8050'
                                        }${member.avatar_url}`
                                      : undefined
                                  }
                                  alt={member.name}
                                />
                                <AvatarFallback className="bg-blue-400 text-white font-semibold">
                                  {member.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <p className="text-xs font-medium line-clamp-2">
                                {member.name}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {members.length > 6 && (
                      <div className="text-center pt-2">
                        <Button
                          variant="link"
                          onClick={() =>
                            router.push(`/trees/${treeId}/members`)
                          }
                        >
                          View all {members.length} members →
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="info" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Tree Information</CardTitle>
                <CardDescription>
                  Details about this family tree and its settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium mb-2">
                    Inclusive Settings
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Same-Sex Relationships
                      </span>
                      <Badge
                        variant={
                          tree.settings?.allowSameSex ? 'default' : 'outline'
                        }
                      >
                        {tree.settings?.allowSameSex
                          ? 'Allowed'
                          : 'Not Allowed'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Polygamy</span>
                      <Badge
                        variant={
                          tree.settings?.allowPolygamy ? 'default' : 'outline'
                        }
                      >
                        {tree.settings?.allowPolygamy
                          ? 'Allowed'
                          : 'Not Allowed'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Monogamy</span>
                      <Badge
                        variant={
                          tree.settings?.monogamy ? 'default' : 'outline'
                        }
                      >
                        {tree.settings?.monogamy ? 'Enforced' : 'Not Enforced'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Single Parent Families
                      </span>
                      <Badge
                        variant={
                          tree.settings?.allowSingleParent
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {tree.settings?.allowSingleParent
                          ? 'Allowed'
                          : 'Not Allowed'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">
                        Multi-Parent Children
                      </span>
                      <Badge
                        variant={
                          tree.settings?.allowMultiParentChildren
                            ? 'default'
                            : 'outline'
                        }
                      >
                        {tree.settings?.allowMultiParentChildren
                          ? 'Allowed'
                          : 'Not Allowed'}
                      </Badge>
                    </div>
                    {tree.settings?.maxParentsPerChild && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Max Parents per Child
                        </span>
                        <Badge variant="secondary">
                          {tree.settings.maxParentsPerChild}
                        </Badge>
                      </div>
                    )}
                    {tree.settings?.maxSpousesPerMember && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Max Spouses per Member
                        </span>
                        <Badge variant="secondary">
                          {tree.settings.maxSpousesPerMember}
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-2">Tree Details</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span>
                        {new Date(tree.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Your Role</span>
                      <Badge
                        variant={
                          tree.user_role === 'custodian'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {tree.user_role}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Member Detail Drawer - only render when not in fullscreen mode */}
      {!isCanvasFullscreen && (
        <MemberDrawer
          member={selectedMember}
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          allMembers={members}
          treeId={treeId}
          isTreeCanvasPage={true}
          onMemberNavigate={(member) => {
            // Navigate to the clicked member
            setSelectedMember(member)
            handleCenterOnMember(member.id)
            // Keep drawer open to show the new member
          }}
          onEditClick={() => {
            setDrawerOpen(false)
            setEditMemberDialogOpen(true)
          }}
          onAddSpouseClick={() => {
            setDrawerOpen(false)
            handleAddMember(selectedMember || undefined, 'spouse')
          }}
          onAddChildClick={() => {
            setDrawerOpen(false)
            handleAddMember(selectedMember || undefined, 'child')
          }}
          onAddParentClick={() => {
            setDrawerOpen(false)
            handleAddMember(selectedMember || undefined, 'parent')
          }}
        />
      )}

      {/* Edit Member Dialog */}
      <EditMemberDialog
        open={editMemberDialogOpen}
        onOpenChange={setEditMemberDialogOpen}
        member={selectedMember}
        allMembers={members}
        treeSettings={tree.settings}
        onSuccess={() => {
          refetchMembers()
          setEditMemberDialogOpen(false)
          toast({
            title: 'Success',
            description: 'Member updated successfully',
          })
        }}
        onMemberUpdate={refetchMembers}
      />

      {/* Add Member Dialog */}
      <AddMemberDialog
        open={addMemberDialogOpen}
        onOpenChange={setAddMemberDialogOpen}
        treeId={treeId}
        relativeTo={addMemberRelativeTo}
        defaultRelationship={addMemberRelationshipType}
        allMembers={members}
        onSuccess={handleAddMemberSuccess}
      />
    </DashboardLayout>
  )
}
