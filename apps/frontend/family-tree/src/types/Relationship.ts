/**
 * Type declaration for supported relationships
 */
export type Relationship =
  | 'PATERNAL-UNCLE'
  | 'MATERNAL-UNCLE'
  | 'PATERNAL-AUNT'
  | 'MATERNAL-AUNT'
  | 'SISTER-IN-LAW'
  | 'BROTHER-IN-LAW'
  | 'COUSIN'
  | 'FATHER'
  | 'MOTHER'
  | 'CHILD'
  | 'SON'
  | 'DAUGHTER'
  | 'BROTHER'
  | 'SISTER'
  | 'GRAND-CHILD'
  | 'GRAND-DAUGHTER'
  | 'GRAND-SON'
  | 'SIBLING'
  | 'SPOUSE'

/**
 * Type declaration for searchable relationships
 */
export type SearchableRelationship =
  | Relationship
  | 'ANCESTOR'
  | 'DESCENDANT'
  | 'COUSIN-IN-LAW'
  | 'FATHER-IN-LAW'
  | 'MOTHER-IN-LAW'
  | 'SON-IN-LAW'
  | 'DAUGHTER-IN-LAW'

/**
 * Type declaration for specific relationship allowed to be added
 */
export type AllowedRelationship = Extract<Relationship, 'CHILD' | 'SPOUSE'>

/**
 * Backend API relationship types
 */
export type RelationshipType = 'spouse' | 'parent-child'

export interface ApiRelationship {
  id: string
  tree_id: string
  type: RelationshipType
  a_member_id: string
  b_member_id: string
  created_at: string
}

export interface RelationshipCreate {
  tree_id: string
  type: RelationshipType
  a_member_id: string
  b_member_id: string
}

/**
 * Computed relationship between two members
 */
export interface ComputedRelationship {
  label: string // e.g., "2nd cousin once removed"
  path: string[] // Array of member IDs showing the path
}

/**
 * Relationship query parameters
 */
export interface RelationshipQueryParams {
  from: string
  to: string
}
