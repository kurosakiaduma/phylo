import { TreeMember } from '@/types/member'
import { FamilyCluster } from './types'
import { LAYOUT_CONSTANTS } from './constants'

/**
 * Calculate age of a member (returns null if age cannot be determined)
 */
function calculateAge(member: TreeMember): number | null {
  if (!member.dob) return null

  try {
    const birthDate = new Date(member.dob)
    let endDate: Date

    if (member.deceased && member.dod) {
      endDate = new Date(member.dod)
    } else if (!member.deceased) {
      endDate = new Date()
    } else {
      return null
    }

    const ageInMs = endDate.getTime() - birthDate.getTime()
    const ageInYears = ageInMs / (1000 * 60 * 60 * 24 * 365.25)
    return Math.floor(ageInYears)
  } catch (error) {
    console.warn(`[Age Calculation] Invalid date for ${member.name}:`, error)
    return null
  }
}

/**
 * Order members by age within nuclear families (for siblings)
 */
function orderMembersByAge(members: TreeMember[]): TreeMember[] {
  if (members.length <= 1) return members

  // Check if these are siblings (share at least one parent)
  const areAllSiblings = members.every((member, index) => {
    if (index === 0) return true
    const firstMemberParents = new Set(members[0].parentIds)
    return member.parentIds.some((parentId) => firstMemberParents.has(parentId))
  })

  if (!areAllSiblings) {
    console.log(
      `[Age Ordering] Members are not siblings, skipping age ordering: [${members
        .map((m) => m.name)
        .join(', ')}]`,
    )
    return members
  }

  console.log(
    `[Age Ordering] Ordering siblings by age: [${members
      .map((m) => m.name)
      .join(', ')}]`,
  )

  return members.sort((a, b) => {
    const ageA = calculateAge(a)
    const ageB = calculateAge(b)

    if (ageA !== null && ageB !== null) {
      return ageB - ageA // Descending order (oldest first)
    }

    if (ageA !== null && ageB === null) return -1
    if (ageA === null && ageB !== null) return 1

    return a.name.localeCompare(b.name)
  })
}

/**
 * Convert family groups to clusters with space calculations
 */
function createClustersFromFamilyGroups(
  familyGroups: Map<string, TreeMember[]>,
  generation: number,
  allMembers: TreeMember[],
): FamilyCluster[] {
  const clusters: FamilyCluster[] = []
  let familyUnitIndex = 0

  familyGroups.forEach((familyMembers, familyKey) => {
    // Apply age-based ordering within nuclear families (siblings)
    const orderedFamilyMembers = orderMembersByAge(familyMembers)

    // Calculate total children for this family unit
    const allChildIds = new Set<string>()
    orderedFamilyMembers.forEach((member) => {
      member.childIds.forEach((childId) => allChildIds.add(childId))
    })
    const childCount = allChildIds.size

    // Calculate required width based on children + minimum parent width
    const effectiveChildSpacing = Math.max(
      LAYOUT_CONSTANTS.SIBLING_SPACING,
      LAYOUT_CONSTANTS.SINGLE_CARD_WIDTH + 100, // Reduced from 200 to 100
    )
    const childrenWidth =
      childCount > 0
        ? childCount * LAYOUT_CONSTANTS.SINGLE_CARD_WIDTH +
          (childCount - 1) * effectiveChildSpacing
        : 0

    // Calculate parent width based on family structure
    let parentWidth: number
    if (orderedFamilyMembers.length === 1) {
      parentWidth = LAYOUT_CONSTANTS.SINGLE_CARD_WIDTH
    } else if (orderedFamilyMembers.length === 2) {
      // Check if they are spouses for couple card width
      const areSpouses =
        orderedFamilyMembers[0].spouseIds.includes(
          orderedFamilyMembers[1].id,
        ) ||
        orderedFamilyMembers[1].spouseIds.includes(orderedFamilyMembers[0].id)
      parentWidth = areSpouses
        ? LAYOUT_CONSTANTS.COUPLE_CARD_WIDTH
        : 2 * LAYOUT_CONSTANTS.SINGLE_CARD_WIDTH + 150 // Two separate cards with spacing
    } else {
      // Co-parents: calculate based on spouse groups to minimize width
      const spouseGroups: TreeMember[][] = []
      const processedIds = new Set<string>()

      orderedFamilyMembers.forEach((member) => {
        if (processedIds.has(member.id)) return

        const spousesInFamily = orderedFamilyMembers.filter(
          (other) =>
            other.id !== member.id &&
            member.spouseIds.includes(other.id) &&
            !processedIds.has(other.id),
        )

        if (spousesInFamily.length > 0) {
          const spouseGroup = [member, ...spousesInFamily]
          spouseGroups.push(spouseGroup)
          spouseGroup.forEach((m) => processedIds.add(m.id))
        } else {
          spouseGroups.push([member])
          processedIds.add(member.id)
        }
      })

      // Width = number of groups * card width + spacing between groups
      const groupSpacing = 150
      parentWidth =
        spouseGroups.length === 1
          ? LAYOUT_CONSTANTS.COUPLE_CARD_WIDTH // Single spouse group
          : spouseGroups.length * LAYOUT_CONSTANTS.SINGLE_CARD_WIDTH +
            (spouseGroups.length - 1) * groupSpacing
    }

    const requiredWidth = Math.max(
      childrenWidth,
      parentWidth,
      LAYOUT_CONSTANTS.SINGLE_CARD_WIDTH * 2,
    ) // Minimum width

    // Determine cluster type with enhanced step-family detection
    let type: 'couple' | 'coparents' | 'single'

    if (orderedFamilyMembers.length === 1) {
      type = 'single'
    } else if (orderedFamilyMembers.length === 2) {
      // Check if they are spouses
      const areSpouses =
        orderedFamilyMembers[0].spouseIds.includes(
          orderedFamilyMembers[1].id,
        ) ||
        orderedFamilyMembers[1].spouseIds.includes(orderedFamilyMembers[0].id)
      type = areSpouses ? 'couple' : 'coparents'
    } else {
      // Multiple members - could be polygamous marriage or step-family
      const spouseConnections = orderedFamilyMembers.reduce(
        (count, member, index) => {
          const otherMembers = orderedFamilyMembers.filter(
            (_, i) => i !== index,
          )
          return (
            count +
            otherMembers.filter((other) => member.spouseIds.includes(other.id))
              .length
          )
        },
        0,
      )

      // If there are spousal connections, it's a complex family unit, otherwise co-parents
      type = spouseConnections > 0 ? 'couple' : 'coparents'
    }

    // Calculate step-family indicators
    const spouseConnections = orderedFamilyMembers.reduce(
      (count, member, index) => {
        const otherMembers = orderedFamilyMembers.filter((_, i) => i !== index)
        return (
          count +
          otherMembers.filter((other) => member.spouseIds.includes(other.id))
            .length
        )
      },
      0,
    )

    const hasStepFamily =
      orderedFamilyMembers.length > 2 ||
      (orderedFamilyMembers.length === 2 && spouseConnections === 0)

    clusters.push({
      members: orderedFamilyMembers,
      type,
      priority: -childCount, // More children = higher priority
      familyUnitId: familyKey,
      familyUnitIndex: familyUnitIndex++,
      childCount,
      requiredWidth,
      hasStepFamily,
      spouseConnections,
    })

    console.log(
      `[Clustering] ✅ Final cluster: [${orderedFamilyMembers
        .map((m) => m.name)
        .join(' + ')}]`,
    )
    console.log(
      `[Clustering]    - Type: ${type}, Children: ${childCount}, Required Width: ${requiredWidth}px`,
    )
    if (hasStepFamily) {
      console.log(
        `[Clustering]    - 🏠 Step-family detected with ${spouseConnections} spousal connections`,
      )
    }
  })

  return clusters
}

/**
 * Analyze co-parent relationships to identify step-families and remarriages
 */
function analyzeCoParentRelationships(
  allMembers: TreeMember[],
  generationMap: Map<string, number>,
  generation: number,
): {
  coParentGroups: Map<string, Set<string>>
  stepFamilyRelationships: Map<string, string[]> // parentId -> list of co-parent IDs they should be near
} {
  const coParentMap = new Map<string, Set<string>>()
  const stepFamilyRelationships = new Map<string, string[]>()

  console.log(
    `[Clustering] Analyzing co-parent relationships for generation ${generation}...`,
  )

  allMembers.forEach((child) => {
    if (child.parentIds.length > 1) {
      // First, get all parents regardless of generation
      const allParents = child.parentIds
        .map((pid) => allMembers.find((m) => m.id === pid))
        .filter((parent): parent is TreeMember => parent !== undefined)

      // Then filter by generation, but also log what we found
      const parentsInThisGen = child.parentIds.filter((pid) => {
        const parent = allMembers.find((m) => m.id === pid)
        return parent && generationMap.get(parent.id) === generation
      })

      // Debug logging for co-parent detection
      console.log(
        `[Clustering] 🔍 Child ${child.name} has ${child.parentIds.length} parents:`,
      )
      allParents.forEach((parent) => {
        const parentGen = generationMap.get(parent.id)
        const inThisGen = parentGen === generation
        console.log(
          `[Clustering]   - ${parent.name} (Gen ${parentGen}) ${
            inThisGen ? '✅ IN THIS GEN' : '❌ DIFFERENT GEN'
          }`,
        )
      })

      if (parentsInThisGen.length > 1) {
        coParentMap.set(child.id, new Set(parentsInThisGen))
        const parentNames = parentsInThisGen.map(
          (pid) => allMembers.find((m) => m.id === pid)?.name,
        )
        console.log(
          `[Clustering] 🔍 Child ${
            child.name
          } has co-parents: [${parentNames.join(
            ', ',
          )}] in generation ${generation}`,
        )

        // Debug: Show generation info for co-parents
        parentsInThisGen.forEach((pid) => {
          const parent = allMembers.find((m) => m.id === pid)
          if (parent) {
            console.log(
              `[Clustering]   - ${
                parent.name
              } is at generation ${generationMap.get(parent.id)}`,
            )
          }
        })

        // Analyze the relationship between co-parents
        const parents = parentsInThisGen
          .map((pid) => allMembers.find((m) => m.id === pid)!)
          .filter(Boolean)

        for (let i = 0; i < parents.length; i++) {
          for (let j = i + 1; j < parents.length; j++) {
            const parent1 = parents[i]
            const parent2 = parents[j]

            // Check if they are spouses (married couple)
            const areSpouses =
              parent1.spouseIds.includes(parent2.id) ||
              parent2.spouseIds.includes(parent1.id)

            if (!areSpouses) {
              // Non-spousal co-parents - likely step-family situation
              console.log(
                `[Clustering] 🏠 Step-family detected: ${parent1.name} and ${parent2.name} are co-parents but not spouses`,
              )

              // Determine which parent should be positioned near the other
              // Priority: parent with more spouses/children should be the "anchor"
              const parent1Priority =
                parent1.spouseIds.length + parent1.childIds.length
              const parent2Priority =
                parent2.spouseIds.length + parent2.childIds.length

              if (parent1Priority >= parent2Priority) {
                // Parent1 is anchor, Parent2 should be near Parent1
                if (!stepFamilyRelationships.has(parent1.id)) {
                  stepFamilyRelationships.set(parent1.id, [])
                }
                stepFamilyRelationships.get(parent1.id)!.push(parent2.id)
                console.log(
                  `[Clustering] 📍 ${parent2.name} should be positioned near ${parent1.name}`,
                )
              } else {
                // Parent2 is anchor, Parent1 should be near Parent2
                if (!stepFamilyRelationships.has(parent2.id)) {
                  stepFamilyRelationships.set(parent2.id, [])
                }
                stepFamilyRelationships.get(parent2.id)!.push(parent1.id)
                console.log(
                  `[Clustering] 📍 ${parent1.name} should be positioned near ${parent2.name}`,
                )
              }
            }
          }
        }
      }
    }
  })

  // Group co-parents together
  const coParentGroups = new Map<string, Set<string>>()
  coParentMap.forEach((parentIds, childId) => {
    const groupKey = Array.from(parentIds).sort().join('|')
    if (!coParentGroups.has(groupKey)) {
      coParentGroups.set(groupKey, new Set())
    }
    parentIds.forEach((pid) => coParentGroups.get(groupKey)!.add(pid))
  })

  return { coParentGroups, stepFamilyRelationships }
}

/**
 * Process root generation with enhanced step-family handling
 */
function processRootGeneration(
  generation: number,
  genMembers: TreeMember[],
  allMembers: TreeMember[],
  generationMap: Map<string, number>,
): FamilyCluster[] {
  console.log(
    `[Clustering] Processing ROOT generation ${generation} with step-family awareness`,
  )
  const processedMembers = new Set<string>()
  const familyGroups = new Map<string, TreeMember[]>()

  // STEP 1: Analyze co-parent relationships including step-families
  const { coParentGroups, stepFamilyRelationships } =
    analyzeCoParentRelationships(allMembers, generationMap, generation)

  console.log(`[Clustering] Found ${coParentGroups.size} co-parent groups:`)
  coParentGroups.forEach((parentIds, groupKey) => {
    const parentNames = Array.from(parentIds).map(
      (pid) => allMembers.find((m) => m.id === pid)?.name,
    )
    console.log(
      `[Clustering] 👥 Co-parent group: [${parentNames.join(
        ' + ',
      )}] (key: ${groupKey})`,
    )
  })

  console.log(`[Clustering] Step-family relationships:`)
  stepFamilyRelationships.forEach((coParentIds, anchorId) => {
    const anchorName = allMembers.find((m) => m.id === anchorId)?.name
    const coParentNames = coParentIds.map(
      (id) => allMembers.find((m) => m.id === id)?.name,
    )
    console.log(
      `[Clustering] 🔗 ${anchorName} -> [${coParentNames.join(', ')}]`,
    )
  })

  // STEP 2: Create primary family groups from spousal relationships first
  genMembers.forEach((member) => {
    if (processedMembers.has(member.id)) return

    // Find spouses in same generation
    const spousesInGeneration = member.spouseIds
      .map((id) => allMembers.find((m) => m.id === id))
      .filter(
        (m): m is TreeMember =>
          m !== undefined &&
          generationMap.get(m.id) === generation &&
          !processedMembers.has(m.id),
      )

    if (spousesInGeneration.length > 0) {
      const familyMembers = [member, ...spousesInGeneration]
      const familyKey = familyMembers
        .map((m) => m.id)
        .sort()
        .join('-')
      familyGroups.set(familyKey, familyMembers)
      familyMembers.forEach((m) => processedMembers.add(m.id))
      console.log(
        `[Clustering] ✅ Created spousal group: [${familyMembers
          .map((m) => m.name)
          .join(' + ')}]`,
      )
    }
  })

  // STEP 3: Handle ALL co-parent groups - ensure non-spousal co-parents are grouped together
  console.log(
    `[Clustering] STEP 3: Processing ${coParentGroups.size} co-parent groups...`,
  )
  coParentGroups.forEach((parentIds, groupKey) => {
    const coParentMembers = Array.from(parentIds)
      .map((id) => allMembers.find((m) => m.id === id))
      .filter((m): m is TreeMember => m !== undefined)

    console.log(
      `[Clustering] Processing co-parent group: [${coParentMembers
        .map((m) => m.name)
        .join(' + ')}]`,
    )

    if (coParentMembers.length > 1) {
      // Check if any of these co-parents are already in spousal groups
      const alreadyProcessed = coParentMembers.filter((m) =>
        processedMembers.has(m.id),
      )
      const notProcessed = coParentMembers.filter(
        (m) => !processedMembers.has(m.id),
      )

      console.log(
        `[Clustering] - Already processed: [${alreadyProcessed
          .map((m) => m.name)
          .join(', ')}]`,
      )
      console.log(
        `[Clustering] - Not processed: [${notProcessed
          .map((m) => m.name)
          .join(', ')}]`,
      )

      if (alreadyProcessed.length > 0 && notProcessed.length > 0) {
        // Some co-parents are already in spousal groups - add the remaining ones to the existing group
        const existingMember = alreadyProcessed[0]

        // Find the family group containing the existing member
        let existingFamilyKey: string | null = null
        let existingFamilyMembers: TreeMember[] | null = null

        for (const [familyKey, familyMembers] of familyGroups.entries()) {
          if (familyMembers.some((m) => m.id === existingMember.id)) {
            existingFamilyKey = familyKey
            existingFamilyMembers = familyMembers
            break
          }
        }

        if (existingFamilyKey && existingFamilyMembers) {
          // Add the remaining co-parents to the existing family group
          notProcessed.forEach((coParent) => {
            existingFamilyMembers!.push(coParent)
            processedMembers.add(coParent.id)
            console.log(
              `[Clustering] 🔗 Added co-parent ${coParent.name} to existing family group with ${existingMember.name}`,
            )
          })

          // Update the family group with new key
          familyGroups.delete(existingFamilyKey)
          const newFamilyKey = existingFamilyMembers
            .map((m) => m.id)
            .sort()
            .join('-')
          familyGroups.set(newFamilyKey, existingFamilyMembers)
          console.log(
            `[Clustering] ✅ Updated family group: [${existingFamilyMembers
              .map((m) => m.name)
              .join(' + ')}]`,
          )
        }
      } else if (notProcessed.length > 1) {
        // All co-parents are unprocessed - create a new co-parent group
        const familyKey = notProcessed
          .map((m) => m.id)
          .sort()
          .join('-')
        familyGroups.set(familyKey, notProcessed)
        notProcessed.forEach((m) => processedMembers.add(m.id))
        console.log(
          `[Clustering] 🔗 Created co-parent group: [${notProcessed
            .map((m) => m.name)
            .join(' + ')}]`,
        )
      } else {
        console.log(
          `[Clustering] ⚠️ Skipping co-parent group - insufficient unprocessed members`,
        )
      }
    } else {
      console.log(`[Clustering] ⚠️ Skipping single-member co-parent group`)
    }
  })

  // STEP 5: Handle remaining single members
  genMembers.forEach((member) => {
    if (processedMembers.has(member.id)) return

    const familyKey = member.id
    familyGroups.set(familyKey, [member])
    processedMembers.add(member.id)
    console.log(`[Clustering] ✅ Created single member: ${member.name}`)
  })

  return createClustersFromFamilyGroups(familyGroups, generation, allMembers)
}

/**
 * Group children into nuclear families (siblings + their spouses)
 * Ensures spouses/partners are placed adjacent to each other within sibling order
 */
function groupChildrenIntoNuclearFamilies(
  children: TreeMember[],
  allMembers: TreeMember[],
  generationMap: Map<string, number>,
  generation: number,
): Array<{ members: TreeMember[]; type: 'couple' | 'coparents' | 'single' }> {
  const processedMembers = new Set<string>()
  const familyGroups: Array<{
    members: TreeMember[]
    type: 'couple' | 'coparents' | 'single'
  }> = []

  // First, identify all sibling groups (children with same parents)
  const siblingGroups = new Map<string, TreeMember[]>()

  children.forEach((child) => {
    if (processedMembers.has(child.id)) return

    // Create a key based on sorted parent IDs to group siblings
    const parentKey = child.parentIds.sort().join('|')
    if (!siblingGroups.has(parentKey)) {
      siblingGroups.set(parentKey, [])
    }
    siblingGroups.get(parentKey)!.push(child)
  })

  // Process each sibling group
  siblingGroups.forEach((siblings, parentKey) => {
    // Order siblings by age within this sibling group
    const orderedSiblings = orderMembersByAge(siblings)

    // For each sibling, create a nuclear family unit with their spouse/partner
    orderedSiblings.forEach((sibling) => {
      if (processedMembers.has(sibling.id)) return

      // Find spouses/partners in same generation
      const spousesInGeneration = sibling.spouseIds
        .map((id) => allMembers.find((m) => m.id === id))
        .filter(
          (m): m is TreeMember =>
            m !== undefined &&
            generationMap.get(m.id) === generation &&
            !processedMembers.has(m.id),
        )

      if (spousesInGeneration.length > 0) {
        // Create nuclear family with sibling and their spouse(s)
        // Order: sibling first, then spouse(s) - this ensures adjacency
        const familyMembers = [sibling, ...spousesInGeneration]
        const isCouple =
          familyMembers.length === 2 &&
          sibling.spouseIds.includes(familyMembers[1].id)

        familyGroups.push({
          members: familyMembers,
          type: isCouple ? 'couple' : 'coparents',
        })

        familyMembers.forEach((m) => processedMembers.add(m.id))
        console.log(
          `[Clustering] 🔗 Nuclear family (sibling + spouse): [${familyMembers
            .map((m) => m.name)
            .join(' + ')}]`,
        )
      } else {
        // Single sibling without spouse in this generation
        familyGroups.push({
          members: [sibling],
          type: 'single',
        })
        processedMembers.add(sibling.id)
        console.log(`[Clustering] 👤 Single sibling: ${sibling.name}`)
      }
    })
  })

  // Handle any remaining members that weren't part of sibling groups
  // (This handles edge cases like adopted children or members with unclear parentage)
  children.forEach((child) => {
    if (processedMembers.has(child.id)) return

    const spousesInGeneration = child.spouseIds
      .map((id) => allMembers.find((m) => m.id === id))
      .filter(
        (m): m is TreeMember =>
          m !== undefined &&
          generationMap.get(m.id) === generation &&
          !processedMembers.has(m.id),
      )

    if (spousesInGeneration.length > 0) {
      const familyMembers = [child, ...spousesInGeneration]
      const isCouple =
        familyMembers.length === 2 &&
        child.spouseIds.includes(familyMembers[1].id)

      familyGroups.push({
        members: familyMembers,
        type: isCouple ? 'couple' : 'coparents',
      })

      familyMembers.forEach((m) => processedMembers.add(m.id))
      console.log(
        `[Clustering] 🔗 Nuclear family (remaining): [${familyMembers
          .map((m) => m.name)
          .join(' + ')}]`,
      )
    } else {
      familyGroups.push({
        members: [child],
        type: 'single',
      })
      processedMembers.add(child.id)
      console.log(`[Clustering] 👤 Single member (remaining): ${child.name}`)
    }
  })

  return familyGroups
}

/**
 * Process descendant generations with nuclear family-aware ordering
 */
function processDescendantGeneration(
  generation: number,
  genMembers: TreeMember[],
  allMembers: TreeMember[],
  generationMap: Map<string, number>,
  parentClusters: FamilyCluster[],
): FamilyCluster[] {
  console.log(
    `[Clustering] Processing DESCENDANT generation ${generation} with nuclear family ordering`,
  )

  const processedMembers = new Set<string>()
  const orderedFamilyGroups: Array<{
    familyKey: string
    members: TreeMember[]
    parentOrder: number
  }> = []

  // STEP 1: Analyze co-parent relationships for this generation too
  const { coParentGroups } = analyzeCoParentRelationships(
    allMembers,
    generationMap,
    generation,
  )

  console.log(
    `[Clustering] Found ${coParentGroups.size} co-parent groups in generation ${generation}:`,
  )
  coParentGroups.forEach((parentIds, groupKey) => {
    const parentNames = Array.from(parentIds).map(
      (pid) => allMembers.find((m) => m.id === pid)?.name,
    )
    console.log(
      `[Clustering] 👥 Co-parent group: [${parentNames.join(
        ' + ',
      )}] (key: ${groupKey})`,
    )
  })

  // STEP 1: PRIORITIZE CO-PARENT GROUPING - Process co-parent groups FIRST
  console.log(
    `[Clustering] STEP 1: Processing co-parent groups for generation ${generation} (PRIORITY)...`,
  )

  // CRITICAL FIX: Process co-parents BEFORE parent cluster ordering
  coParentGroups.forEach((parentIds, groupKey) => {
    const coParentMembers = Array.from(parentIds)
      .map((id) => allMembers.find((m) => m.id === id))
      .filter((m): m is TreeMember => m !== undefined)
      .filter((m) => generationMap.get(m.id) === generation) // Only members in this generation

    console.log(
      `[Clustering] Processing co-parent group: [${coParentMembers
        .map((m) => m.name)
        .join(' + ')}]`,
    )

    if (
      coParentMembers.length > 1 &&
      !coParentMembers.some((m) => processedMembers.has(m.id))
    ) {
      // Group co-parents together with highest priority
      const familyKey = coParentMembers
        .map((m) => m.id)
        .sort()
        .join('-')

      // Determine parent order based on the first co-parent's original parent cluster
      let parentOrder = 999 // Default to end
      for (let i = 0; i < parentClusters.length; i++) {
        const cluster = parentClusters[i]
        if (
          cluster.members.some((parent) =>
            parent.childIds.some((childId) =>
              coParentMembers.some((coParent) => coParent.id === childId),
            ),
          )
        ) {
          parentOrder = i
          break
        }
      }

      // Check if they're actually spouses (married couple) or just co-parents
      const areSpouses =
        coParentMembers.length === 2 &&
        coParentMembers[0].spouseIds.includes(coParentMembers[1].id)

      orderedFamilyGroups.push({
        familyKey,
        members: coParentMembers,
        parentOrder,
      })

      coParentMembers.forEach((m) => processedMembers.add(m.id))
      console.log(
        `[Clustering] 🔗 Created co-parent group: [${coParentMembers
          .map((m) => m.name)
          .join(' + ')}] (${
          areSpouses ? 'couple' : 'co-parents'
        }, parent order: ${parentOrder})`,
      )
    }
  })

  // STEP 2: Process children in the order of their parents' positioning (for non-co-parents)
  parentClusters.forEach((parentCluster, parentClusterIndex) => {
    console.log(
      `[Clustering] Processing children of parent cluster ${parentClusterIndex}: [${parentCluster.members
        .map((m) => m.name)
        .join(' + ')}]`,
    )

    // Collect all children of this parent cluster
    const childrenOfThisCluster = new Set<TreeMember>()

    parentCluster.members.forEach((parent) => {
      parent.childIds.forEach((childId) => {
        const child = allMembers.find((m) => m.id === childId)
        if (
          child &&
          generationMap.get(child.id) === generation &&
          !processedMembers.has(child.id)
        ) {
          childrenOfThisCluster.add(child)
        }
      })
    })

    if (childrenOfThisCluster.size > 0) {
      console.log(
        `[Clustering] Found ${
          childrenOfThisCluster.size
        } children: [${Array.from(childrenOfThisCluster)
          .map((c) => c.name)
          .join(', ')}]`,
      )

      // Group these children by their nuclear families (shared parents + spouses)
      const childFamilyGroups = groupChildrenIntoNuclearFamilies(
        Array.from(childrenOfThisCluster),
        allMembers,
        generationMap,
        generation,
      )

      // Add these family groups with parent ordering
      childFamilyGroups.forEach((familyGroup) => {
        const familyKey = familyGroup.members
          .map((m) => m.id)
          .sort()
          .join('-')
        orderedFamilyGroups.push({
          familyKey,
          members: familyGroup.members,
          parentOrder: parentClusterIndex,
        })
        familyGroup.members.forEach((m) => processedMembers.add(m.id))
      })
    }
  })

  // STEP 3: Handle any remaining members (orphans or those without parents in previous generation)
  const remainingMembers = genMembers.filter((m) => !processedMembers.has(m.id))
  if (remainingMembers.length > 0) {
    console.log(
      `[Clustering] STEP 3: Processing ${remainingMembers.length} remaining members without clear parent ordering`,
    )

    const remainingFamilyGroups = groupChildrenIntoNuclearFamilies(
      remainingMembers,
      allMembers,
      generationMap,
      generation,
    )

    remainingFamilyGroups.forEach((familyGroup) => {
      const familyKey = familyGroup.members
        .map((m) => m.id)
        .sort()
        .join('-')
      orderedFamilyGroups.push({
        familyKey,
        members: familyGroup.members,
        parentOrder: 999, // Put at end
      })
    })
  }

  // Sort by parent order to maintain nuclear family grouping
  orderedFamilyGroups.sort((a, b) => a.parentOrder - b.parentOrder)

  console.log(
    `[Clustering] Final ordered family groups for generation ${generation}:`,
  )
  orderedFamilyGroups.forEach((group, index) => {
    console.log(
      `[Clustering]   ${index}: [${group.members
        .map((m) => m.name)
        .join(' + ')}] (parent order: ${group.parentOrder})`,
    )
  })

  // Convert to clusters
  const familyGroups = new Map<string, TreeMember[]>()
  orderedFamilyGroups.forEach((group) => {
    familyGroups.set(group.familyKey, group.members)
  })

  return createClustersFromFamilyGroups(familyGroups, generation, allMembers)
}

/**
 * Build nuclear family-aware clusters with generational ordering
 */
export function buildFamilyClusters(
  members: TreeMember[],
  generationMap: Map<string, number>,
  generations: Map<number, TreeMember[]>,
): Map<number, FamilyCluster[]> {
  console.log('[Clustering] Starting nuclear family-aware clustering...')
  const clusters = new Map<number, FamilyCluster[]>()

  // Initialize empty clusters for each generation
  Array.from(generations.keys()).forEach((gen) => {
    clusters.set(gen, [])
  })

  // Process generations in order, with special handling for root vs descendants
  const sortedGenerations = Array.from(generations.entries()).sort(
    ([a], [b]) => a - b,
  )

  sortedGenerations.forEach(([generation, genMembers]) => {
    console.log(
      `[Clustering] Processing generation ${generation} with ${genMembers.length} members`,
    )

    if (generation === 0) {
      // ROOT GENERATION: Use existing logic
      const rootClusters = processRootGeneration(
        generation,
        genMembers,
        members,
        generationMap,
      )
      clusters.set(generation, rootClusters)
    } else {
      // DESCENDANT GENERATIONS: Use nuclear family-aware ordering
      const parentGeneration = generation - 1
      const parentClusters = clusters.get(parentGeneration) || []
      const descendantClusters = processDescendantGeneration(
        generation,
        genMembers,
        members,
        generationMap,
        parentClusters,
      )
      clusters.set(generation, descendantClusters)
    }
  })

  return clusters
}
