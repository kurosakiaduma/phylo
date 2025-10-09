/**
 * Member types that align with backend API and family-tree-core
 */

export type MemberId = string

export type Gender = 'male' | 'female' | 'unspecified' | string

/**
 * Member data from backend API
 */
export interface ApiMember {
  id: MemberId
  tree_id: string
  name: string
  email?: string
  avatar_url?: string
  dob?: string // ISO date string
  dod?: string // Date of death
  gender?: Gender
  pronouns?: string
  deceased: boolean
  birth_place?: string
  death_place?: string
  occupation?: string
  bio?: string
  notes?: string
  created_at: string
  updated_at: string
  updated_by?: string
}

/**
 * Member with computed relationships for tree visualization
 * Extends ApiMember with relationship arrays computed from backend relationships
 */
export interface TreeMember extends ApiMember {
  spouseIds: MemberId[]
  parentIds: MemberId[]
  childIds: MemberId[]
}

/**
 * Member creation payload
 */
export interface MemberCreate {
  name: string
  email?: string
  avatar_url?: string
  dob?: string
  dod?: string
  gender?: Gender
  pronouns?: string
  deceased?: boolean
  birth_place?: string
  death_place?: string
  occupation?: string
  bio?: string
  notes?: string
}

/**
 * Member update payload
 */
export interface MemberUpdate {
  name?: string
  email?: string
  avatar_url?: string
  dob?: string
  dod?: string
  gender?: Gender
  pronouns?: string
  deceased?: boolean
  birth_place?: string
  death_place?: string
  occupation?: string
  bio?: string
  notes?: string
}

/**
 * Paginated member list response
 */
export interface MemberListResponse {
  items: ApiMember[]
  total: number
  next?: string
}

/**
 * Visual node for canvas rendering
 */
export interface MemberNode {
  member: TreeMember
  x: number
  y: number
  generation: number
  spouses: TreeMember[]
  familyUnitId?: string
}
