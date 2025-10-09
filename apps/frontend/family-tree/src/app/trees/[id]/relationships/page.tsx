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
import { DashboardLayout } from '@/components/dashboard-layout'
import { RelationshipAnalyzer } from '@/components/RelationshipAnalyzer'
import { useToast } from '@/hooks/use-toast'
import { useTreeMembers } from '@/hooks/use-tree-members'
import { TreeMember } from '@/types/member'
import { ArrowLeft, Network, Loader2, Users } from 'lucide-react'

interface Tree {
  id: string
  name: string
  description?: string
  role: 'custodian' | 'contributor' | 'viewer'
}

export default function RelationshipsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [tree, setTree] = useState<Tree | null>(null)
  const [loading, setLoading] = useState(true)
  const [analyzerOpen, setAnalyzerOpen] = useState(false)

  const treeId = params.id as string

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

  if (loading || membersLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              Loading relationship analyzer...
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!tree) {
    return null
  }

  if (membersError) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Relationship Analyzer
              </h1>
              <p className="text-muted-foreground">{tree.name}</p>
            </div>
          </div>

          <Card>
            <CardContent className="flex h-[400px] items-center justify-center">
              <div className="text-center">
                <Network className="mx-auto mb-4 h-16 w-16 text-destructive" />
                <h3 className="mb-2 text-xl font-semibold">
                  Error Loading Members
                </h3>
                <p className="mb-6 text-muted-foreground">
                  {membersError.message}
                </p>
                <Button onClick={() => refetchMembers()}>Try Again</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  if (members.length < 2) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Relationship Analyzer
              </h1>
              <p className="text-muted-foreground">{tree.name}</p>
            </div>
          </div>

          <Card>
            <CardContent className="flex h-[400px] items-center justify-center">
              <div className="text-center">
                <Users className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
                <h3 className="mb-2 text-xl font-semibold">
                  Not Enough Members
                </h3>
                <p className="mb-6 text-muted-foreground">
                  You need at least 2 family members to analyze relationships.
                </p>
                <Button onClick={() => router.push(`/trees/${treeId}`)}>
                  Add More Members
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
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
              Relationship Analyzer
            </h1>
            <p className="text-muted-foreground">
              {tree.name} • {members.length} members
            </p>
          </div>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Analyze Family Relationships
            </CardTitle>
            <CardDescription>
              Discover how any two family members are related, including complex
              relationships like cousins, in-laws, and degrees of removal. The
              analyzer considers both maternal and paternal lines to provide
              accurate relationship descriptions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Network className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Ready to Analyze</h3>
              <p className="text-muted-foreground mb-6">
                Click the button below to open the relationship analyzer and
                discover connections between family members.
              </p>
              <Button onClick={() => setAnalyzerOpen(true)}>
                <Network className="h-4 w-4 mr-2" />
                Open Analyzer
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Members
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{members.length}</div>
              <p className="text-xs text-muted-foreground">
                Family members in this tree
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Possible Relationships
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {members.length > 1 ? members.length * (members.length - 1) : 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Unique relationship pairs to analyze
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Generations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {getGenerationCount(members)}
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated generations in tree
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Relationship Analyzer Dialog */}
        <RelationshipAnalyzer
          members={members}
          treeId={treeId}
          open={analyzerOpen}
          onOpenChange={setAnalyzerOpen}
        />
      </div>
    </DashboardLayout>
  )
}

/**
 * Estimate the number of generations in the tree
 */
function getGenerationCount(members: TreeMember[]): number {
  if (members.length === 0) return 0

  // Simple heuristic: count the maximum depth from any root member
  // This is a simplified calculation - a full implementation would
  // build the actual family tree structure

  const rootMembers = members.filter((member) => member.parentIds.length === 0)
  if (rootMembers.length === 0) return 1

  // For now, return a simple estimate based on tree structure
  // In a full implementation, you'd traverse the tree to find max depth
  return Math.min(Math.ceil(members.length / 3), 6)
}
