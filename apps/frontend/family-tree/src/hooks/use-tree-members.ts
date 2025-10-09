/**
 * Hook for fetching and managing tree members
 */

import { useState, useEffect, useCallback } from 'react'
import { TreeMember, ApiMember } from '@/types/member'
import { ApiRelationship } from '@/types/Relationship'

interface UseTreeMembersOptions {
  treeId: string
  autoFetch?: boolean
}

interface UseTreeMembersReturn {
  members: TreeMember[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
  getMemberById: (id: string) => TreeMember | undefined
  getRootMembers: () => TreeMember[]
}

/**
 * Custom hook to fetch and manage tree members with their relationships
 */
export function useTreeMembers({
  treeId,
  autoFetch = true,
}: UseTreeMembersOptions): UseTreeMembersReturn {
  const [members, setMembers] = useState<TreeMember[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  /**
   * Build relationship maps from relationships array
   */
  const buildRelationshipMaps = (
    apiMembers: ApiMember[],
    relationships: ApiRelationship[],
  ): TreeMember[] => {
    // Initialize all members with empty relationship arrays
    const membersMap = new Map<string, TreeMember>()
    apiMembers.forEach((member) => {
      membersMap.set(member.id, {
        ...member,
        spouseIds: [],
        parentIds: [],
        childIds: [],
      })
    })

    // Build relationship arrays
    relationships.forEach((rel) => {
      const memberA = membersMap.get(rel.a_member_id)
      const memberB = membersMap.get(rel.b_member_id)

      if (!memberA || !memberB) return

      if (rel.type === 'spouse') {
        // Bidirectional spouse relationship
        if (!memberA.spouseIds.includes(rel.b_member_id)) {
          memberA.spouseIds.push(rel.b_member_id)
        }
        if (!memberB.spouseIds.includes(rel.a_member_id)) {
          memberB.spouseIds.push(rel.a_member_id)
        }
      } else if (rel.type === 'parent-child') {
        // A is parent, B is child
        if (!memberA.childIds.includes(rel.b_member_id)) {
          memberA.childIds.push(rel.b_member_id)
        }
        if (!memberB.parentIds.includes(rel.a_member_id)) {
          memberB.parentIds.push(rel.a_member_id)
        }
      }
    })

    return Array.from(membersMap.values())
  }

  /**
   * Fetch members and relationships from API
   */
  const fetchMembers = useCallback(async () => {
    if (!treeId) return

    setLoading(true)
    setError(null)

    try {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050/api'

      // Fetch all members (paginate to get all, backend limit is 200 per request)
      let allMembers: ApiMember[] = []
      let cursor: string | undefined = undefined
      let hasMore = true

      // Fetch all pages
      while (hasMore) {
        const url = cursor
          ? `${baseUrl}/trees/${treeId}/members?limit=200&after=${cursor}`
          : `${baseUrl}/trees/${treeId}/members?limit=200`

        const membersResponse = await fetch(url, {
          credentials: 'include',
        })

        if (!membersResponse.ok) {
          throw new Error(
            `Failed to fetch members: ${membersResponse.statusText}`,
          )
        }

        const membersData = await membersResponse.json()
        const items: ApiMember[] = membersData.items || membersData

        allMembers = [...allMembers, ...items]

        // Check if there are more pages
        cursor = membersData.next
        hasMore = !!cursor && items.length > 0
      }

      // Fetch all relationships for this tree
      const relationshipsResponse = await fetch(
        `${baseUrl}/trees/${treeId}/relationships`,
        {
          credentials: 'include',
        },
      )

      if (!relationshipsResponse.ok) {
        throw new Error(
          `Failed to fetch relationships: ${relationshipsResponse.statusText}`,
        )
      }

      const relationships: ApiRelationship[] =
        await relationshipsResponse.json()

      console.log('[useTreeMembers] Fetched data:', {
        memberCount: allMembers.length,
        relationshipCount: relationships.length,
        relationships: relationships,
        members: allMembers.map((m) => ({ id: m.id, name: m.name })),
      })

      // Build tree members with relationship arrays
      const treeMembers = buildRelationshipMaps(allMembers, relationships)

      console.log('[useTreeMembers] Built tree members:', {
        treeMembers: treeMembers.map((m) => ({
          id: m.id,
          name: m.name,
          parentIds: m.parentIds,
          childIds: m.childIds,
          spouseIds: m.spouseIds,
        })),
      })

      setMembers(treeMembers)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'))
      console.error('Error fetching tree members:', err)
    } finally {
      setLoading(false)
    }
  }, [treeId])

  /**
   * Get member by ID
   */
  const getMemberById = useCallback(
    (id: string): TreeMember | undefined => {
      return members.find((m) => m.id === id)
    },
    [members],
  )

  /**
   * Get root members (members with no parents)
   */
  const getRootMembers = useCallback((): TreeMember[] => {
    return members.filter((m) => m.parentIds.length === 0)
  }, [members])

  useEffect(() => {
    if (autoFetch) {
      fetchMembers()
    }
  }, [autoFetch, fetchMembers])

  return {
    members,
    loading,
    error,
    refetch: fetchMembers,
    getMemberById,
    getRootMembers,
  }
}
