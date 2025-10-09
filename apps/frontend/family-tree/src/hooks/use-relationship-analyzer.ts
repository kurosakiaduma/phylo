/**
 * Hook for analyzing relationships between family members
 */

import { useState, useEffect } from 'react'

export interface RelationshipResult {
  from_member_id: string
  from_member_name: string
  to_member_id: string
  to_member_name: string
  relationship: string
  path: string[]
  path_names: string[]
}

export interface UseRelationshipAnalyzerOptions {
  treeId: string
}

export function useRelationshipAnalyzer({
  treeId,
}: UseRelationshipAnalyzerOptions) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<RelationshipResult | null>(null)

  const analyzeRelationship = async (
    fromMemberId: string,
    toMemberId: string,
  ) => {
    if (!fromMemberId || !toMemberId) {
      setError('Both member IDs are required')
      return null
    }

    if (fromMemberId === toMemberId) {
      setError('Cannot analyze relationship between the same person')
      return null
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/relations/${treeId}/between?from=${fromMemberId}&to=${toMemberId}`,
        {
          credentials: 'include',
        },
      )

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('One or both members not found in this tree')
        }
        if (response.status === 403) {
          throw new Error('You do not have access to this tree')
        }
        throw new Error('Failed to analyze relationship')
      }

      const data: RelationshipResult = await response.json()
      setResult(data)
      setError(null) // Clear any previous errors
      return data
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      setResult(null) // Clear any previous results
      return null
    } finally {
      setLoading(false)
    }
  }

  const reset = () => {
    setResult(null)
    setError(null)
    setLoading(false)
  }

  return {
    analyzeRelationship,
    loading,
    error,
    result,
    reset,
  }
}
