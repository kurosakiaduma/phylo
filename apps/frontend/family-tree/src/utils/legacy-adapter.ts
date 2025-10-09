/**
 * Adapter to convert new API TreeMember format to old IMember format
 * This allows the old FamilyTree component to work with the new API
 */

import { IMember } from '@/types/IMember'
import { TreeMember } from '@/types/member'
import { Gender as OldGender } from '@/types/Gender'

/**
 * Convert new gender format to old format
 */
export function convertGender(gender?: string): OldGender {
  if (!gender) return OldGender.MALE
  const g = gender.toLowerCase()
  if (g === 'male') return OldGender.MALE
  if (g === 'female') return OldGender.FEMALE
  return OldGender.MALE // Default for unspecified
}

/**
 * Convert API TreeMember to old IMember format (recursive)
 */
export function convertToLegacyMember(
  member: TreeMember,
  allMembers: TreeMember[],
  visited = new Set<string>(),
): IMember {
  // Prevent infinite recursion
  if (visited.has(member.id)) {
    return {
      name: member.name,
      gender: convertGender(member.gender),
      spouse: null,
      children: [],
    }
  }
  visited.add(member.id)

  // Get first spouse (old format only supports one spouse)
  const spouseId = member.spouseIds[0]
  const spouseMember = spouseId
    ? allMembers.find((m) => m.id === spouseId)
    : null

  // Get children
  const children = member.childIds
    .map((id) => allMembers.find((m) => m.id === id))
    .filter((m): m is TreeMember => m !== undefined)
    .map((child) => convertToLegacyMember(child, allMembers, visited))

  return {
    name: member.name,
    gender: convertGender(member.gender),
    spouse: spouseMember
      ? convertToLegacyMember(spouseMember, allMembers, visited)
      : null,
    children,
  }
}

/**
 * Find a root member (someone with no parents) to use as tree root
 */
export function findRootMember(members: TreeMember[]): TreeMember | null {
  const roots = members.filter((m) => m.parentIds.length === 0)
  if (roots.length === 0) return members[0] || null
  return roots[0]
}

/**
 * Convert full tree members list to legacy format
 */
export function convertTreeToLegacy(members: TreeMember[]): IMember | null {
  if (members.length === 0) return null

  const root = findRootMember(members)
  if (!root) return null

  return convertToLegacyMember(root, members)
}
