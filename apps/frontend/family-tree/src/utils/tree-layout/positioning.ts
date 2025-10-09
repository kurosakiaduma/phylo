import { TreeMember, MemberNode } from '@/types/member'
import { FamilyCluster } from './types'
import { LAYOUT_CONSTANTS } from './constants'

/**
 * Position family clusters on the canvas using space-aware algorithm
 */
export function positionFamilyClusters(
  familyClusters: Map<number, FamilyCluster[]>,
  members: TreeMember[],
  generationMap: Map<string, number>,
): MemberNode[] {
  console.log('[Positioning] Starting space-aware positioning...')
  const nodes: MemberNode[] = []

  // PASS 1: Position parents with space reserved for their children
  const parentGenerations = Array.from(familyClusters.keys()).sort(
    (a, b) => a - b,
  )
  const familyCenterPositions = new Map<string, number>() // familyKey -> centerX position

  parentGenerations.forEach((generation) => {
    const clusters = familyClusters.get(generation)!
    const y = generation * LAYOUT_CONSTANTS.VERTICAL_SPACING
    let xOffset = 0

    console.log(
      `[Positioning] PASS 1 - Positioning generation ${generation} with space awareness`,
    )

    clusters.forEach((cluster, clusterIndex) => {
      // Use the pre-calculated required width for this family unit
      const requiredWidth =
        cluster.requiredWidth || LAYOUT_CONSTANTS.SINGLE_CARD_WIDTH
      const familyCenterX = xOffset + requiredWidth / 2

      console.log(
        `[Positioning] Family [${cluster.members
          .map((m) => m.name)
          .join(' + ')}]: center=${familyCenterX}, width=${requiredWidth}`,
      )

      if (cluster.type === 'couple') {
        // Position couple at the center of their allocated space
        const primaryMember = cluster.members[0]
        const spouses = cluster.members.slice(1)

        const node: MemberNode = {
          member: primaryMember,
          x: familyCenterX,
          y,
          generation,
          spouses: spouses,
          familyUnitId: cluster.familyUnitId,
        }
        nodes.push(node)
      } else if (cluster.type === 'coparents') {
        // Enhanced positioning for co-parents including step-families
        // Ensure spouses/partners are adjacent to each other to avoid line crossings
        const coParentSpacing = 150 // Closer spacing for co-parents to keep them grouped

        // Create spouse-adjacent groups first
        const spouseGroups: TreeMember[][] = []
        const processedIds = new Set<string>()

        // Group spouses together
        cluster.members.forEach((member) => {
          if (processedIds.has(member.id)) return

          const spousesInCluster = cluster.members.filter(
            (other) =>
              other.id !== member.id &&
              member.spouseIds.includes(other.id) &&
              !processedIds.has(other.id),
          )

          if (spousesInCluster.length > 0) {
            // Create a spouse group with the member and their spouse(s)
            const spouseGroup = [member, ...spousesInCluster]
            spouseGroups.push(spouseGroup)
            spouseGroup.forEach((m) => processedIds.add(m.id))
            console.log(
              `[Positioning] 💑 Created spouse group: [${spouseGroup
                .map((m) => m.name)
                .join(' + ')}]`,
            )
          } else {
            // Single member without spouse in cluster
            spouseGroups.push([member])
            processedIds.add(member.id)
            console.log(`[Positioning] 👤 Single co-parent: ${member.name}`)
          }
        })

        // Calculate total width needed for all groups
        const totalGroups = spouseGroups.length
        const totalSpacing = (totalGroups - 1) * coParentSpacing
        // Include card width in total width calculation
        const totalWidth =
          totalSpacing + totalGroups * LAYOUT_CONSTANTS.SINGLE_CARD_WIDTH
        const startX = familyCenterX - totalWidth / 2

        // Position each spouse group
        let currentX = startX
        spouseGroups.forEach((spouseGroup, groupIndex) => {
          if (spouseGroup.length === 1) {
            // Single member
            const member = spouseGroup[0]
            const spousesInGeneration = member.spouseIds
              .map((id) => members.find((m) => m.id === id))
              .filter(
                (m): m is TreeMember =>
                  m !== undefined && generationMap.get(m.id) === generation,
              )

            const node: MemberNode = {
              member,
              x: currentX,
              y,
              generation,
              spouses: spousesInGeneration.filter((spouse) =>
                cluster.members.some(
                  (clusterMember) => clusterMember.id === spouse.id,
                ),
              ),
              familyUnitId: cluster.familyUnitId,
            }
            nodes.push(node)
            console.log(
              `[Positioning] Single co-parent ${member.name} positioned at x=${node.x}`,
            )
          } else {
            // Spouse group - create a couple card
            const primaryMember = spouseGroup[0]
            const spouses = spouseGroup.slice(1)

            const node: MemberNode = {
              member: primaryMember,
              x: currentX,
              y,
              generation,
              spouses: spouses,
              familyUnitId: cluster.familyUnitId,
            }
            nodes.push(node)
            console.log(
              `[Positioning] Spouse group [${spouseGroup
                .map((m) => m.name)
                .join(' + ')}] positioned at x=${node.x}`,
            )
          }

          // Move to next group position
          if (groupIndex < totalGroups - 1) {
            currentX += coParentSpacing
          }
        })
      } else {
        // Single member - position at family center
        cluster.members.forEach((member, memberIndex) => {
          const spousesInGeneration = member.spouseIds
            .map((id) => members.find((m) => m.id === id))
            .filter(
              (m): m is TreeMember =>
                m !== undefined && generationMap.get(m.id) === generation,
            )

          const node: MemberNode = {
            member,
            x: familyCenterX,
            y,
            generation,
            spouses: spousesInGeneration,
            familyUnitId: cluster.familyUnitId,
          }
          nodes.push(node)
        })
      }

      // Store the center position for this family unit (for children positioning)
      const familyKey = cluster.familyUnitId || cluster.members[0].id
      familyCenterPositions.set(familyKey, familyCenterX)

      // Move to next family position
      xOffset += requiredWidth + LAYOUT_CONSTANTS.FAMILY_GROUP_SPACING
    })

    // Center each generation
    const totalWidth = xOffset - LAYOUT_CONSTANTS.FAMILY_GROUP_SPACING
    const centerOffset = -totalWidth / 2
    nodes
      .filter((n) => n.generation === generation)
      .forEach((n) => {
        n.x += centerOffset

        // Update family center positions with the offset
        const member = n.member
        const familyKey = n.familyUnitId || member.id
        const currentCenter = familyCenterPositions.get(familyKey)
        if (currentCenter !== undefined) {
          familyCenterPositions.set(familyKey, currentCenter + centerOffset)
        }
      })

    console.log(
      `[Positioning] Generation ${generation} centered with offset ${centerOffset}`,
    )
  })

  console.log('[Positioning] ✅ Space-aware positioning complete!')
  return nodes
}
