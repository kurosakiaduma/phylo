'use client'

import { useState, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DashboardLayout } from '@/components/dashboard-layout'
import { MemberDrawer } from '@/components/MemberDrawer'
import { useTreeMembers } from '@/hooks/use-tree-members'
import { TreeMember } from '@/types/member'
import {
  UserPlus,
  Search,
  Users,
  Loader2,
  Grid3x3,
  List,
  ChevronRight,
  ArrowLeft,
  Network,
} from 'lucide-react'

/**
 * Get initials from name
 */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get gender-based color
 */
const getGenderColor = (gender?: string): string => {
  if (!gender) return 'bg-gray-400'
  const g = gender.toLowerCase()
  if (g === 'male') return 'bg-blue-400'
  if (g === 'female') return 'bg-pink-400'
  return 'bg-purple-400'
}

/**
 * Member card component for grid/list view
 */
function MemberCard({
  member,
  onClick,
  viewMode = 'grid',
}: {
  member: TreeMember
  onClick: () => void
  viewMode?: 'grid' | 'list'
}) {
  if (viewMode === 'list') {
    return (
      <Card
        className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              <AvatarImage src={member.avatar_url} alt={member.name} />
              <AvatarFallback className={getGenderColor(member.gender)}>
                {getInitials(member.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <h3 className="font-medium">{member.name}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {member.dob && (
                  <span>b. {new Date(member.dob).getFullYear()}</span>
                )}
                {member.deceased && member.dod && (
                  <span>d. {new Date(member.dod).getFullYear()}</span>
                )}
                {member.gender && (
                  <Badge variant="outline" className="text-xs">
                    {member.gender}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {member.deceased && <Badge variant="secondary">Deceased</Badge>}
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
      onClick={onClick}
    >
      <CardContent className="flex flex-col items-center gap-3 p-4">
        <Avatar className="h-20 w-20">
          <AvatarImage src={member.avatar_url} alt={member.name} />
          <AvatarFallback className={getGenderColor(member.gender)}>
            {getInitials(member.name)}
          </AvatarFallback>
        </Avatar>

        <div className="text-center">
          <h3 className="font-medium line-clamp-1">{member.name}</h3>
          <div className="mt-1 space-y-1">
            {member.dob && (
              <p className="text-xs text-muted-foreground">
                b. {new Date(member.dob).getFullYear()}
              </p>
            )}
            {member.deceased && member.dod && (
              <p className="text-xs text-muted-foreground">
                d. {new Date(member.dod).getFullYear()}
              </p>
            )}
          </div>

          <div className="mt-2 flex flex-wrap justify-center gap-1">
            {member.gender && (
              <Badge variant="outline" className="text-xs">
                {member.gender}
              </Badge>
            )}
            {member.deceased && (
              <Badge variant="secondary" className="text-xs">
                Deceased
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function MembersPage() {
  const params = useParams()
  const router = useRouter()
  const treeId = params.id as string

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'alive' | 'deceased'
  >('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [selectedMember, setSelectedMember] = useState<TreeMember | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Fetch members
  const { members, loading, error, refetch } = useTreeMembers({
    treeId,
    autoFetch: true,
  })

  // Filter and search members
  const filteredMembers = useMemo(() => {
    return members.filter((member) => {
      // Search filter
      const matchesSearch = member.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase())

      // Status filter
      const matchesStatus =
        statusFilter === 'all'
          ? true
          : statusFilter === 'alive'
          ? !member.deceased
          : member.deceased

      return matchesSearch && matchesStatus
    })
  }, [members, searchQuery, statusFilter])

  const handleMemberClick = (member: TreeMember) => {
    setSelectedMember(member)
    setDrawerOpen(true)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading members...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="flex h-full items-center justify-center py-12">
          <div className="text-center">
            <Users className="mx-auto mb-4 h-16 w-16 text-destructive" />
            <h3 className="mb-2 text-xl font-semibold">
              Error Loading Members
            </h3>
            <p className="mb-6 text-muted-foreground">{error.message}</p>
            <Button onClick={() => refetch()}>Try Again</Button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header with Back Navigation */}
        <div className="flex flex-col gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/trees/${treeId}`)}
            className="w-fit"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tree
          </Button>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Family Members
              </h1>
              <p className="text-muted-foreground">
                {filteredMembers.length} of {members.length} members
              </p>
            </div>

            <div className="flex gap-2">
              {members.length >= 2 && (
                <Button
                  variant="outline"
                  onClick={() => router.push(`/trees/${treeId}/relationships`)}
                >
                  <Network className="mr-2 h-4 w-4" />
                  Analyze Relationships
                </Button>
              )}
              <Button
                onClick={() => router.push(`/trees/${treeId}/members/new`)}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Add Member
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search members by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status Filter */}
              <Tabs
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as 'all' | 'alive' | 'deceased')}
              >
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="alive">Living</TabsTrigger>
                  <TabsTrigger value="deceased">Deceased</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* View Mode */}
              <div className="flex gap-1 rounded-md border p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Members Grid/List */}
        {filteredMembers.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-xl font-semibold">
                {members.length === 0 ? 'No Members Yet' : 'No Members Found'}
              </h3>
              <p className="mb-6 text-center text-muted-foreground">
                {members.length === 0
                  ? 'Start building your family tree by adding your first member'
                  : 'Try adjusting your search or filters'}
              </p>
              {members.length === 0 && (
                <Button
                  onClick={() => router.push(`/trees/${treeId}/members/new`)}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add First Member
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'
                : 'space-y-2'
            }
          >
            {filteredMembers.map((member) => (
              <MemberCard
                key={member.id}
                member={member}
                onClick={() => handleMemberClick(member)}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Member Detail Drawer */}
      <MemberDrawer
        member={selectedMember}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        allMembers={members}
        treeId={treeId}
        isTreeCanvasPage={false}
        onMemberNavigate={(member) => {
          // On members listing page, just open the clicked member's drawer
          setSelectedMember(member)
          // Keep drawer open to show the new member
        }}
        onEditClick={() => {
          if (selectedMember) {
            router.push(`/trees/${treeId}/members/${selectedMember.id}/edit`)
          }
        }}
        onAddSpouseClick={() => {
          if (selectedMember) {
            router.push(
              `/trees/${treeId}/members/${selectedMember.id}/add-spouse`,
            )
          }
        }}
        onAddChildClick={() => {
          if (selectedMember) {
            router.push(
              `/trees/${treeId}/members/${selectedMember.id}/add-child`,
            )
          }
        }}
      />
    </DashboardLayout>
  )
}
