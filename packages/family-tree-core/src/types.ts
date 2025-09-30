export type MemberId = string;

export type Gender = 'male' | 'female' | 'unspecified' | string;

export interface MemberInput {
  name: string;
  email?: string;
  dob?: string; // ISO date
  gender?: Gender;
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
  monogamy: boolean; // if true, only single spouse allowed
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

export type RelationshipType = 'spouse' | 'parent' | 'child' | 'sibling' | 'unknown';
