import { TreeMember } from '@/types/member'

/**
 * Calculate generations for all members using hierarchical positioning
 */
export function calculateGenerations(members: TreeMember[]): {
  generationMap: Map<string, number>
  generations: Map<number, TreeMember[]>
} {
  const generationMap = new Map<string, number>()
  const generations = new Map<number, TreeMember[]>()

  console.log('[Generation] Starting robust generation calculation...')

  // Step 1: Find true root nodes intelligently
  const calculateDescendantDepth = (
    memberId: string,
    visited = new Set<string>(),
  ): number => {
    if (visited.has(memberId)) return 0
    visited.add(memberId)

    const member = members.find((m) => m.id === memberId)
    if (!member || member.childIds.length === 0) return 0

    const childDepths = member.childIds.map((childId) =>
      calculateDescendantDepth(childId, new Set(visited)),
    )
    return 1 + Math.max(...childDepths, 0)
  }

  const candidateRoots = members.filter((m) => m.parentIds.length === 0)
  const rootsWithDepth = candidateRoots.map((member) => ({
    member,
    depth: calculateDescendantDepth(member.id),
  }))

  const rootNodes = rootsWithDepth
    .filter(({ depth }) => depth > 0)
    .sort((a, b) => b.depth - a.depth)
    .map(({ member }) => member)

  const finalRoots = rootNodes.length > 0 ? rootNodes : candidateRoots

  console.log(
    '[Generation] Selected roots:',
    finalRoots.map((m) => m.name),
  )

  // Step 2: Set root nodes to generation 0
  finalRoots.forEach((root) => {
    generationMap.set(root.id, 0)
    console.log(`[Generation] Set root ${root.name} = Gen 0`)
  })

  // Step 3: Forward propagation
  let changed = true
  let iterations = 0
  const maxIterations = 20

  while (changed && iterations < maxIterations) {
    changed = false
    iterations++

    members.forEach((member) => {
      if (generationMap.has(member.id)) return

      const validParentIds = member.parentIds.filter((pid) =>
        members.some((m) => m.id === pid),
      )

      if (validParentIds.length === 0) {
        generationMap.set(member.id, 0)
        changed = true
        console.log(
          `[Generation] Set ${member.name} = Gen 0 (no valid parents)`,
        )
        return
      }

      const parentGenerations = validParentIds
        .map((pid) => generationMap.get(pid))
        .filter((gen) => gen !== undefined) as number[]

      if (
        parentGenerations.length === validParentIds.length &&
        parentGenerations.length > 0
      ) {
        const maxParentGen = Math.max(...parentGenerations)
        const childGeneration = maxParentGen + 1
        generationMap.set(member.id, childGeneration)
        changed = true
        console.log(`[Generation] Set ${member.name} = Gen ${childGeneration}`)
      }
    })
  }

  // Step 4: Co-parent alignment with sibling cohesion
  console.log('[Generation] Aligning co-parents and their siblings...')
  let alignmentChanged = true
  let alignmentIterations = 0

  while (alignmentChanged && alignmentIterations < 10) {
    alignmentChanged = false
    alignmentIterations++

    members.forEach((child) => {
      if (child.parentIds.length <= 1) return

      const parentData = child.parentIds
        .map((pid) => ({
          id: pid,
          member: members.find((m) => m.id === pid),
          generation: generationMap.get(pid),
        }))
        .filter((p) => p.member && p.generation !== undefined)

      if (parentData.length <= 1) return

      const childGen = generationMap.get(child.id)
      if (childGen === undefined) return

      const expectedParentGen = childGen - 1
      const misalignedParents = parentData.filter(
        (p) => p.generation !== expectedParentGen,
      )

      if (misalignedParents.length > 0) {
        parentData.forEach((p) => {
          if (p.generation !== expectedParentGen) {
            console.log(
              `[Generation] Aligning co-parent ${p.member?.name} to Gen ${expectedParentGen}`,
            )
            generationMap.set(p.id, expectedParentGen)
            alignmentChanged = true

            // CRITICAL: When we move a co-parent, move ALL children of their parents to maintain generational baseline
            // This handles cases like Millicent (co-parent) where ALL of Huldah's children should move to Millicent's level
            if (p.member) {
              // Find all parents of the moved co-parent
              p.member.parentIds.forEach((parentId) => {
                const parent = members.find((m) => m.id === parentId)
                if (!parent) return

                // Move ALL children of this parent to the same generation as the co-parent
                parent.childIds.forEach((childId) => {
                  if (childId === p.id) return // Skip the co-parent themselves (already moved)

                  const child = members.find((m) => m.id === childId)
                  if (!child) return

                  const childCurrentGen = generationMap.get(childId)
                  if (childCurrentGen !== expectedParentGen) {
                    console.log(
                      `[Generation] 🌳 GENERATIONAL BASELINE: Moving ${
                        child.name
                      } from Gen ${childCurrentGen} to Gen ${expectedParentGen} (same generation as co-parent ${
                        p.member!.name
                      } - all children of ${parent.name})`,
                    )
                    generationMap.set(childId, expectedParentGen)
                    alignmentChanged = true
                  }
                })
              })
            }
          }
        })
      }
    })
  }

  // Step 5: Sibling cohesion enforcement
  console.log(
    '[Generation] Enforcing sibling cohesion across family branches...',
  )
  let siblingCohesionChanged = true
  let siblingIterations = 0

  while (siblingCohesionChanged && siblingIterations < 10) {
    siblingCohesionChanged = false
    siblingIterations++

    members.forEach((member) => {
      const memberGen = generationMap.get(member.id)
      if (memberGen === undefined) return

      // Find all siblings (people who share at least one parent)
      const siblings = members.filter((otherMember) => {
        if (otherMember.id === member.id) return false

        // Check if they share at least one parent
        const sharedParents = otherMember.parentIds.filter((pid) =>
          member.parentIds.includes(pid),
        )
        return sharedParents.length > 0
      })

      // Ensure all siblings are at the same generation level
      siblings.forEach((sibling) => {
        const siblingGen = generationMap.get(sibling.id)
        if (siblingGen !== undefined && siblingGen !== memberGen) {
          console.log(
            `[Generation] 🔗 Sibling cohesion: Moving ${sibling.name} from Gen ${siblingGen} to Gen ${memberGen} (same as sibling ${member.name})`,
          )
          generationMap.set(sibling.id, memberGen)
          siblingCohesionChanged = true
        }
      })
    })
  }

  // Step 6: Comprehensive married-in family positioning
  console.log('[Generation] Aligning spouses and their entire family trees...')
  let spouseAlignmentChanged = true
  let spouseIterations = 0

  // Helper function to recursively adjust an entire family tree relative to a base generation
  const adjustFamilyTree = (
    memberId: string,
    baseGeneration: number,
    visited = new Set<string>(),
    reason = 'family adjustment',
    depth = 0,
  ) => {
    // Prevent infinite recursion in complex family structures
    if (visited.has(memberId) || depth > 8) return
    visited.add(memberId)

    const member = members.find((m) => m.id === memberId)
    if (!member) return

    const currentGen = generationMap.get(memberId)

    // Set this member's generation relative to the base
    if (currentGen !== baseGeneration) {
      console.log(
        `[Generation] 🔧 ${reason}: ${member.name} from Gen ${currentGen} to Gen ${baseGeneration}`,
      )
      generationMap.set(memberId, baseGeneration)
      spouseAlignmentChanged = true
    }

    // Create a new visited set for each branch to allow proper traversal
    const newVisited = new Set(visited)

    // Recursively adjust parents (one generation up)
    // Parents should always be at least one generation above their children
    member.parentIds.forEach((parentId) => {
      if (!newVisited.has(parentId)) {
        adjustFamilyTree(
          parentId,
          baseGeneration - 1,
          newVisited,
          `parent of ${member.name}`,
          depth + 1,
        )
      }
    })

    // Recursively adjust children (one generation down)
    // Children should always be at least one generation below their parents
    member.childIds.forEach((childId) => {
      if (!newVisited.has(childId)) {
        adjustFamilyTree(
          childId,
          baseGeneration + 1,
          newVisited,
          `child of ${member.name}`,
          depth + 1,
        )
      }
    })

    // Establish generational baseline - ALL children of this member's parents should be at the same level
    // This ensures entire family generations move together when one member's position changes
    member.parentIds.forEach((parentId) => {
      const parent = members.find((m) => m.id === parentId)
      if (!parent || newVisited.has(parentId)) return

      // Move ALL children of this parent to the same generation
      parent.childIds.forEach((childId) => {
        if (childId === memberId || newVisited.has(childId)) return

        const child = members.find((m) => m.id === childId)
        if (!child) return

        const currentChildGen = generationMap.get(childId)
        if (currentChildGen !== baseGeneration) {
          console.log(
            `[Generation] 🌳 GENERATIONAL BASELINE: Adjusting ${child.name} from Gen ${currentChildGen} to Gen ${baseGeneration} (same generation as ${member.name} - all children of ${parent.name})`,
          )
          adjustFamilyTree(
            childId,
            baseGeneration,
            newVisited,
            `generational baseline with ${member.name}`,
            depth + 1,
          )
        }
      })
    })

    // Adjust spouses (same generation)
    // Spouses should be at the same generation level
    member.spouseIds.forEach((spouseId) => {
      if (!newVisited.has(spouseId)) {
        adjustFamilyTree(
          spouseId,
          baseGeneration,
          newVisited,
          `spouse of ${member.name}`,
          depth + 1,
        )
      }
    })

    // 🌳 COMPREHENSIVE IN-LAW FAMILY POSITIONING
    // When we adjust a married-in person, we need to adjust their entire extended family
    member.spouseIds.forEach((spouseId) => {
      const spouse = members.find((m) => m.id === spouseId)
      if (!spouse || newVisited.has(spouseId)) return

      // Adjust spouse's parents (in-laws) - they should be one generation up from the spouse
      spouse.parentIds.forEach((inLawParentId) => {
        if (!newVisited.has(inLawParentId)) {
          adjustFamilyTree(
            inLawParentId,
            baseGeneration - 1,
            newVisited,
            `in-law parent of ${member.name}`,
            depth + 1,
          )

          // Also adjust the in-law parent's other children (spouse's siblings)
          const inLawParent = members.find((m) => m.id === inLawParentId)
          if (inLawParent) {
            inLawParent.childIds.forEach((inLawSiblingId) => {
              if (
                inLawSiblingId !== spouseId &&
                !newVisited.has(inLawSiblingId)
              ) {
                adjustFamilyTree(
                  inLawSiblingId,
                  baseGeneration,
                  newVisited,
                  `in-law sibling of ${member.name}`,
                  depth + 1,
                )
              }
            })
          }
        }
      })

      // Adjust spouse's grandparents (two generations up from spouse)
      spouse.parentIds.forEach((inLawParentId) => {
        const inLawParent = members.find((m) => m.id === inLawParentId)
        if (inLawParent) {
          inLawParent.parentIds.forEach((grandparentId) => {
            if (!newVisited.has(grandparentId)) {
              adjustFamilyTree(
                grandparentId,
                baseGeneration - 2,
                newVisited,
                `in-law grandparent of ${member.name}`,
                depth + 1,
              )
            }
          })
        }
      })

      // Adjust spouse's children from previous relationships (step-children)
      spouse.childIds.forEach((stepChildId) => {
        // Only adjust if this child is not also a child of the current member
        if (
          !member.childIds.includes(stepChildId) &&
          !newVisited.has(stepChildId)
        ) {
          adjustFamilyTree(
            stepChildId,
            baseGeneration + 1,
            newVisited,
            `step-child of ${member.name}`,
            depth + 1,
          )
        }
      })

      // Adjust spouse's siblings' families (in-law extended family)
      members.forEach((potentialInLawSibling) => {
        if (
          potentialInLawSibling.id === spouseId ||
          newVisited.has(potentialInLawSibling.id)
        )
          return

        // Check if they share parents with the spouse (making them siblings)
        const sharedParentsWithSpouse = potentialInLawSibling.parentIds.filter(
          (pid) => spouse.parentIds.includes(pid),
        )

        if (sharedParentsWithSpouse.length > 0) {
          // This is a sibling of the spouse (in-law sibling)
          adjustFamilyTree(
            potentialInLawSibling.id,
            baseGeneration,
            newVisited,
            `in-law sibling of ${member.name}`,
            depth + 1,
          )

          // Also adjust their children (in-law nieces/nephews)
          potentialInLawSibling.childIds.forEach((nieceNephewId) => {
            if (!newVisited.has(nieceNephewId)) {
              adjustFamilyTree(
                nieceNephewId,
                baseGeneration + 1,
                newVisited,
                `in-law niece/nephew of ${member.name}`,
                depth + 1,
              )
            }
          })
        }
      })
    })
  }

  while (spouseAlignmentChanged && spouseIterations < 15) {
    spouseAlignmentChanged = false
    spouseIterations++

    members.forEach((member) => {
      const memberGen = generationMap.get(member.id)
      if (memberGen === undefined) return

      member.spouseIds.forEach((spouseId) => {
        const spouse = members.find((m) => m.id === spouseId)
        if (!spouse) return

        const currentSpouseGen = generationMap.get(spouseId)

        // If spouse is not at the same generation as the member, adjust their entire family tree
        if (currentSpouseGen !== memberGen) {
          console.log(
            `[Generation] 🌳 Adjusting entire married-in family tree for spouse: ${spouse.name} (${currentSpouseGen} → ${memberGen})`,
          )

          // Adjust the spouse and their entire family tree
          adjustFamilyTree(
            spouseId,
            memberGen,
            new Set(),
            `married-in family alignment`,
          )

          // CRITICAL: Move ALL children of the spouse's parents to establish generational baseline
          // This handles cases where one family member marries in and their entire generation should align
          spouse.parentIds.forEach((parentId) => {
            const parent = members.find((m) => m.id === parentId)
            if (!parent) return

            // Move ALL children of this parent to the same generation as the spouse
            parent.childIds.forEach((childId) => {
              if (childId === spouseId) return // Skip the spouse themselves (already moved)

              const child = members.find((m) => m.id === childId)
              if (!child) return

              const childCurrentGen = generationMap.get(childId)
              if (childCurrentGen !== memberGen) {
                console.log(
                  `[Generation] 🌳 SPOUSE GENERATIONAL BASELINE: Moving ${child.name} from Gen ${childCurrentGen} to Gen ${memberGen} (same generation as married-in ${spouse.name} - all children of ${parent.name})`,
                )
                adjustFamilyTree(
                  childId,
                  memberGen,
                  new Set(),
                  `generational baseline with married-in ${spouse.name}`,
                )
              }
            })
          })
        }
      })
    })
  }

  // Step 7: Final validation and cleanup for married-in families
  console.log(
    '[Generation] Final validation of married-in family positioning...',
  )
  let validationChanged = true
  let validationIterations = 0

  while (validationChanged && validationIterations < 5) {
    validationChanged = false
    validationIterations++

    members.forEach((member) => {
      const memberGen = generationMap.get(member.id)
      if (memberGen === undefined) return

      // Ensure all parents are at least one generation above
      member.parentIds.forEach((parentId) => {
        const parentGen = generationMap.get(parentId)
        if (parentGen !== undefined && parentGen >= memberGen) {
          const newParentGen = memberGen - 1
          console.log(
            `[Generation] 🔧 Final validation: Moving parent to maintain hierarchy: ${members.find(
              (m) => m.id === parentId,
            )?.name} to Gen ${newParentGen}`,
          )
          generationMap.set(parentId, newParentGen)
          validationChanged = true
        }
      })

      // Ensure all children are at least one generation below
      member.childIds.forEach((childId) => {
        const childGen = generationMap.get(childId)
        if (childGen !== undefined && childGen <= memberGen) {
          const newChildGen = memberGen + 1
          console.log(
            `[Generation] 🔧 Final validation: Moving child to maintain hierarchy: ${members.find(
              (m) => m.id === childId,
            )?.name} to Gen ${newChildGen}`,
          )
          generationMap.set(childId, newChildGen)
          validationChanged = true
        }
      })
    })
  }

  // Step 8: Final sibling cohesion pass (after all other adjustments)
  console.log('[Generation] Final sibling cohesion enforcement...')
  let finalSiblingChanged = true
  let finalSiblingIterations = 0

  while (finalSiblingChanged && finalSiblingIterations < 5) {
    finalSiblingChanged = false
    finalSiblingIterations++

    members.forEach((member) => {
      const memberGen = generationMap.get(member.id)
      if (memberGen === undefined) return

      // Find all siblings and ensure they're at the same level
      members.forEach((potentialSibling) => {
        if (potentialSibling.id === member.id) return

        // Check if they share at least one parent
        const sharedParents = potentialSibling.parentIds.filter((pid) =>
          member.parentIds.includes(pid),
        )

        if (sharedParents.length > 0) {
          const siblingGen = generationMap.get(potentialSibling.id)
          if (siblingGen !== undefined && siblingGen !== memberGen) {
            console.log(
              `[Generation] 🔗 Final sibling alignment: ${potentialSibling.name} from Gen ${siblingGen} to Gen ${memberGen} (same as ${member.name})`,
            )
            generationMap.set(potentialSibling.id, memberGen)
            finalSiblingChanged = true
          }
        }
      })
    })
  }

  // Step 9: Handle orphans
  members.forEach((member) => {
    if (!generationMap.has(member.id)) {
      generationMap.set(member.id, 0)
      console.log(`[Generation] Set orphan ${member.name} = Gen 0`)
    }
  })

  // Step 10: Group members by generation
  members.forEach((member) => {
    const gen = generationMap.get(member.id)!
    if (!generations.has(gen)) {
      generations.set(gen, [])
    }
    generations.get(gen)!.push(member)
  })

  console.log(
    '[Generation] 🎯 FINAL Generation structure with sibling cohesion:',
  )
  Array.from(generations.entries())
    .sort(([a], [b]) => a - b)
    .forEach(([gen, genMembers]) => {
      console.log(`  Gen ${gen}: ${genMembers.map((m) => m.name).join(', ')}`)

      // Verify sibling relationships within each generation
      const siblingGroups = new Map<string, string[]>()
      genMembers.forEach((member) => {
        if (member.parentIds.length > 0) {
          const parentKey = member.parentIds.sort().join('|')
          if (!siblingGroups.has(parentKey)) {
            siblingGroups.set(parentKey, [])
          }
          siblingGroups.get(parentKey)!.push(member.name)
        }
      })

      siblingGroups.forEach((siblings, parentKey) => {
        if (siblings.length > 1) {
          console.log(
            `    🔗 Sibling group: [${siblings.join(
              ', ',
            )}] (parents: ${parentKey})`,
          )
        }
      })
    })

  return { generationMap, generations }
}
