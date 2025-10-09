// packages/family-tree-core
export type MemberId = string;
export interface MemberInput {
  name: string;
  email?: string;
  dob?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer not to say' |'unspecified';
  deceased?: boolean;
  notes?: string;
}
export interface Member extends MemberInput {
  id: MemberId;
  spouseIds: MemberId[];
  parentIds: MemberId[];
  childIds: MemberId[];
}
export interface TreeSettings {
  allowSameSex: boolean;
  monogamy: boolean;
  allowPolygamy: boolean;
  maxSpousesPerMember?: number;
  allowSingleParent: boolean;
  allowMultiParentChildren: boolean;
  maxParentsPerChild?: number;
}

export interface Tree {
  id: string;
  name: string;
  description?: string;
  settings: TreeSettings;
}

export type RelationshipType =
  | 'spouse'
  | 'parent'
  | 'child'
  | 'sibling'
  | 'cousin'
  | 'aunt'
  | 'uncle'
  | 'grandparent'
  | 'grandchild'
  | 'great-grandparent'
  | 'great-grandchild'
  | 'in-law';
