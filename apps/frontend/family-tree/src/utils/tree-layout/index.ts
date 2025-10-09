import { TreeMember } from '@/types/member'
import { LayoutResult } from './types'
import { calculateGenerations } from './generation-calculator'
import { buildFamilyClusters } from './family-clustering'
import { positionFamilyClusters } from './positioning'

/**
 * Main tree layout calculation function
 * Uses nuclear family-aware positioning with generational ordering
 */
export function calculateTreeLayout(members: TreeMember[]): LayoutResult {
  console.log(
    '[Layout] Starting nuclear family-aware tree layout calculation...',
  )

  // Step 1: Calculate generations
  const { generationMap, generations } = calculateGenerations(members)

  // Step 2: Build family clusters with nuclear family awareness
  const familyClusters = buildFamilyClusters(
    members,
    generationMap,
    generations,
  )

  // Debug: Log the family clusters
  console.log('[Layout] Family clusters created:')
  Array.from(familyClusters.entries()).forEach(([gen, clusters]) => {
    console.log(`[Layout] Gen ${gen}: ${clusters.length} clusters`)
    clusters.forEach((cluster, index) => {
      console.log(
        `[Layout] ${index}: [${cluster.members
          .map((m) => m.name)
          .join(' + ')}] (${cluster.type})`,
      )
    })
  })

  // Step 3: Position clusters on canvas
  const nodes = positionFamilyClusters(familyClusters, members, generationMap)

  console.log('[Layout] ✅ Nuclear family-aware layout complete!')
  console.log(
    `[Layout] Generated ${nodes.length} nodes across ${generations.size} generations`,
  )

  return { nodes, generations }
}

// Re-export types and constants for convenience
export * from './types'
export * from './constants'
