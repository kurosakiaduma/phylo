/**
 * API-specific types that extend the core types with backend response fields
 * These types match the backend schemas and API responses
 */

import { Tree, TreeSettings } from '@family-tree/core'

/**
 * Backend TreeSettings use snake_case, so we need to map them
 */
export interface ApiTreeSettings {
  allow_same_sex: boolean
  monogamy: boolean
  allow_polygamy: boolean
  max_spouses_per_member?: number
  allow_single_parent: boolean
  allow_multi_parent_children: boolean
  max_parents_per_child?: number
}

/**
 * API Tree response - extends core Tree with backend fields
 */
export interface ApiTree {
  id: string
  name: string
  description?: string
  settings: ApiTreeSettings
  created_by: string
  created_at: string
}

/**
 * Tree with user membership information
 */
export interface ApiTreeWithMembership extends ApiTree {
  role: 'custodian' | 'contributor' | 'viewer'
  joined_at: string
  member_count: number
}

/**
 * Tree creation payload
 */
export interface ApiTreeCreate {
  name: string
  description?: string
  settings?: Partial<ApiTreeSettings>
}

/**
 * Tree update payload
 */
export interface ApiTreeUpdate {
  name?: string
  description?: string
  settings?: Partial<ApiTreeSettings>
}

/**
 * Membership information
 */
export interface ApiMembershipInfo {
  user_id: string
  user_email: string
  user_display_name?: string
  role: 'custodian' | 'contributor' | 'viewer'
  joined_at: string
}

/**
 * Membership update payload
 */
export interface ApiMembershipUpdate {
  role: 'custodian' | 'contributor' | 'viewer'
}

/**
 * Convert API tree settings to core tree settings
 */
export function apiSettingsToCore(apiSettings: ApiTreeSettings): TreeSettings {
  return {
    allowSameSex: apiSettings.allow_same_sex,
    monogamy: apiSettings.monogamy,
    allowPolygamy: apiSettings.allow_polygamy,
    maxSpousesPerMember: apiSettings.max_spouses_per_member,
    allowSingleParent: apiSettings.allow_single_parent,
    allowMultiParentChildren: apiSettings.allow_multi_parent_children,
    maxParentsPerChild: apiSettings.max_parents_per_child,
  }
}

/**
 * Convert core tree settings to API tree settings
 */
export function coreSettingsToApi(
  coreSettings: Partial<TreeSettings>,
): Partial<ApiTreeSettings> {
  return {
    allow_same_sex: coreSettings.allowSameSex,
    monogamy: coreSettings.monogamy,
    allow_polygamy: coreSettings.allowPolygamy,
    max_spouses_per_member: coreSettings.maxSpousesPerMember,
    allow_single_parent: coreSettings.allowSingleParent,
    allow_multi_parent_children: coreSettings.allowMultiParentChildren,
    max_parents_per_child: coreSettings.maxParentsPerChild,
  }
}

/**
 * Convert API tree to core tree
 */
export function apiTreeToCore(apiTree: ApiTree): Tree {
  return {
    id: apiTree.id,
    name: apiTree.name,
    description: apiTree.description,
    settings: apiSettingsToCore(apiTree.settings),
  }
}
