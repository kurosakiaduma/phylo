import { TreeMember, MemberNode } from '@/types/member'

export interface FamilyCluster {
  members: TreeMember[]
  type: 'couple' | 'coparents' | 'single'
  priority: number
  familyUnitId?: string
  familyUnitIndex?: number
  childCount: number
  requiredWidth: number
  parentOrder?: number
  hasStepFamily?: boolean // Indicates if this cluster contains step-family relationships
  spouseConnections?: number // Number of spousal connections within the cluster
}

export interface GenerationClusters {
  [generation: number]: FamilyCluster[]
}

export interface LayoutConstants {
  SINGLE_CARD_WIDTH: number
  COUPLE_CARD_WIDTH: number
  HORIZONTAL_SPACING: number
  VERTICAL_SPACING: number
  COUPLE_SPACING: number
  FAMILY_GROUP_SPACING: number
  SIBLING_SPACING: number
}

export interface LayoutResult {
  nodes: MemberNode[]
  generations: Map<number, TreeMember[]>
}
