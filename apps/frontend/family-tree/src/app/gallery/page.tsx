'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/dashboard-layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Image, Loader2, TreePine, ArrowRight } from 'lucide-react'

interface Tree {
  id: string
  name: string
  description?: string
  role: 'custodian' | 'contributor' | 'viewer'
}

export default function GalleryPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [trees, setTrees] = useState<Tree[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTrees()
  }, [])

  const fetchTrees = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trees`, {
        credentials: 'include',
      })

      if (!response.ok) throw new Error('Failed to fetch trees')

      const data = await response.json()
      setTrees(data)

      // Don't auto-redirect - let users choose which tree's gallery to view
    } catch (error) {
      console.error('Error fetching trees:', error)
      toast({
        title: 'Error',
        description: 'Failed to load your trees. Please try again.',
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
            <p className="text-muted-foreground">Loading your trees...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Family Gallery</h1>
          <p className="text-muted-foreground mt-1">
            Photos and memories from your family history
          </p>
        </div>

        {trees.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No Trees Available</CardTitle>
              <CardDescription>
                You need to create or join a family tree to access the gallery.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => router.push('/trees')}>
                <TreePine className="h-4 w-4 mr-2" />
                Go to Trees
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Select a Family Tree
              </CardTitle>
              <CardDescription>
                Choose which family tree&apos;s gallery you&apos;d like to view
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {trees.map((tree) => (
                  <Card
                    key={tree.id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => router.push(`/trees/${tree.id}/gallery`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {tree.name}
                          </h3>
                          <p className="text-sm text-muted-foreground capitalize">
                            {tree.role}
                          </p>
                          {tree.description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {tree.description}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-4 w-4 text-muted-foreground ml-2" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
