'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import {
  TreePine,
  Plus,
  Loader2,
  Users,
  Calendar,
  Crown,
  Eye,
  UserCheck,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ApiTreeWithMembership } from '@/types/api'

export default function TreesPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [trees, setTrees] = useState<ApiTreeWithMembership[]>([])
  const [treesLoading, setTreesLoading] = useState(true)
  const [getStartedOpen, setGetStartedOpen] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/')
    }
  }, [isAuthenticated, isLoading, router])

  useEffect(() => {
    if (isAuthenticated) {
      fetchTrees()
    }
  }, [isAuthenticated])

  const fetchTrees = async () => {
    try {
      setTreesLoading(true)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trees`, {
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Failed to fetch trees')
      }

      const data = await response.json()
      setTrees(data)

      // Show "Get Started" modal for new users
      if (data.length === 0) {
        setGetStartedOpen(true)
      }
    } catch (error) {
      console.error('Error fetching trees:', error)
      toast({
        title: 'Error',
        description: 'Failed to load your trees. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setTreesLoading(false)
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'custodian':
        return <Crown className="h-4 w-4" />
      case 'contributor':
        return <UserCheck className="h-4 w-4" />
      case 'viewer':
        return <Eye className="h-4 w-4" />
      default:
        return null
    }
  }

  const getRoleBadgeVariant = (
    role: string,
  ): 'default' | 'secondary' | 'outline' => {
    switch (role) {
      case 'custodian':
        return 'default'
      case 'contributor':
        return 'secondary'
      case 'viewer':
        return 'outline'
      default:
        return 'outline'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      {/* Get Started Modal */}
      <Dialog open={getStartedOpen} onOpenChange={setGetStartedOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TreePine className="h-6 w-6 text-primary" />
              Get Started with Phylo
            </DialogTitle>
            <DialogDescription className="space-y-4 pt-4">
              <p>
                Welcome to your family tree dashboard! Here&apos;s what you can do:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <TreePine className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Create a Tree</p>
                    <p className="text-sm">
                      Start building your family history
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Add Members</p>
                    <p className="text-sm">Fill in details about your family</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <UserCheck className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Collaborate</p>
                    <p className="text-sm">Invite family to contribute</p>
                  </div>
                </div>
              </div>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setGetStartedOpen(false)}>
              Maybe Later
            </Button>
            <Button
              onClick={() => {
                setGetStartedOpen(false)
                router.push('/trees/new')
              }}
            >
              Create Your First Tree
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Your Family Trees
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage and explore your family history
            </p>
          </div>
          <Button onClick={() => router.push('/trees/new')} size="lg">
            <Plus className="h-5 w-5 mr-2" />
            Create New Tree
          </Button>
        </div>

        {/* Trees Grid */}
        {treesLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Loading your trees...</p>
            </div>
          </div>
        ) : trees.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <TreePine className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Trees Yet</h3>
              <p className="text-muted-foreground mb-6 text-center max-w-sm">
                Create your first family tree to start building your family
                history
              </p>
              <Button onClick={() => router.push('/trees/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Tree
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trees.map((tree) => (
              <Card
                key={tree.id}
                className="hover:shadow-lg transition-shadow cursor-pointer group"
                onClick={() => router.push(`/trees/${tree.id}`)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-1 group-hover:text-primary transition-colors">
                      {tree.name}
                    </CardTitle>
                    <Badge
                      variant={getRoleBadgeVariant(tree.role)}
                      className="flex items-center gap-1 shrink-0"
                    >
                      {getRoleIcon(tree.role)}
                      <span className="capitalize">{tree.role}</span>
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {tree.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-muted-foreground">
                      <Users className="h-4 w-4 mr-2" />
                      <span>
                        {tree.member_count}{' '}
                        {tree.member_count === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                    <div className="flex items-center text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span>Joined {formatDate(tree.joined_at)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="text-xs text-muted-foreground">
                  Click to view and manage this tree
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
