/**
 * Gender Identity Configuration for Phylo Frontend
 *
 * Comprehensive gender identity options with associated colors
 * for inclusive representation across the application.
 */

export interface GenderOption {
  value: string
  label: string
  color: string // Tailwind color name
  description: string
}

/**
 * Comprehensive gender identity options
 * Colors are Tailwind CSS color names
 */
export const GENDER_OPTIONS: GenderOption[] = [
  {
    value: 'woman',
    label: 'Woman',
    color: 'pink',
    description: 'Identifies as a woman',
  },
  {
    value: 'man',
    label: 'Man',
    color: 'blue',
    description: 'Identifies as a man',
  },
  {
    value: 'non-binary',
    label: 'Non-binary',
    color: 'purple',
    description: 'Identifies outside the gender binary',
  },
  {
    value: 'genderqueer',
    label: 'Genderqueer',
    color: 'violet',
    description:
      'Gender identity that is not exclusively masculine or feminine',
  },
  {
    value: 'genderfluid',
    label: 'Genderfluid',
    color: 'indigo',
    description: 'Gender identity that varies over time',
  },
  {
    value: 'agender',
    label: 'Agender',
    color: 'gray',
    description: 'Without gender or gender neutral',
  },
  {
    value: 'bigender',
    label: 'Bigender',
    color: 'teal',
    description: 'Identifies as two genders',
  },
  {
    value: 'transgender-woman',
    label: 'Transgender Woman',
    color: 'rose',
    description: 'A woman who was assigned male at birth',
  },
  {
    value: 'transgender-man',
    label: 'Transgender Man',
    color: 'sky',
    description: 'A man who was assigned female at birth',
  },
  {
    value: 'two-spirit',
    label: 'Two-Spirit',
    color: 'amber',
    description: 'Indigenous North American term for gender variant people',
  },
  {
    value: 'intersex',
    label: 'Intersex',
    color: 'emerald',
    description:
      "Born with sex characteristics that don't fit typical binary notions",
  },
  {
    value: 'gender-non-conforming',
    label: 'Gender Non-conforming',
    color: 'lime',
    description: 'Does not conform to gender norms',
  },
  {
    value: 'gender-questioning',
    label: 'Gender Questioning',
    color: 'yellow',
    description: 'Exploring or questioning gender identity',
  },
  {
    value: 'androgyne',
    label: 'Androgyne',
    color: 'cyan',
    description: 'Combination of masculine and feminine characteristics',
  },
  {
    value: 'demigirl',
    label: 'Demigirl',
    color: 'fuchsia',
    description: 'Partially identifies as a woman',
  },
  {
    value: 'demiboy',
    label: 'Demiboy',
    color: 'lightBlue',
    description: 'Partially identifies as a man',
  },
  {
    value: 'pangender',
    label: 'Pangender',
    color: 'orange',
    description: 'Identifies with many or all genders',
  },
  {
    value: 'neutrois',
    label: 'Neutrois',
    color: 'slate',
    description: 'Neutral or null gender',
  },
  {
    value: 'prefer-not-to-say',
    label: 'Prefer not to say',
    color: 'neutral',
    description: 'Prefers not to disclose gender identity',
  },
  {
    value: 'other',
    label: 'Other',
    color: 'stone',
    description: 'Gender identity not listed',
  },
]

/**
 * Common pronoun options
 */
export const PRONOUN_OPTIONS: string[] = [
  'she/her',
  'he/him',
  'they/them',
  'she/they',
  'he/they',
  'ze/hir',
  'ze/zir',
  'xe/xem',
  'ey/em',
  'fae/faer',
  'per/pers',
  've/ver',
  'ne/nem',
  'co/cos',
  'it/its',
  'any pronouns',
  'ask me',
  'other',
]

/**
 * Event type options for milestones and celebrations
 */
export const EVENT_TYPES: Array<{
  value: string
  label: string
  icon?: string
}> = [
  { value: 'birthday', label: 'Birthday', icon: '🎂' },
  { value: 'anniversary', label: 'Anniversary', icon: '💍' },
  { value: 'wedding', label: 'Wedding', icon: '💒' },
  { value: 'engagement', label: 'Engagement', icon: '💝' },
  { value: 'birth', label: 'Birth', icon: '👶' },
  { value: 'death', label: 'Death', icon: '🕊️' },
  { value: 'graduation', label: 'Graduation', icon: '🎓' },
  { value: 'baptism', label: 'Baptism', icon: '✝️' },
  { value: 'bar-mitzvah', label: 'Bar Mitzvah', icon: '✡️' },
  { value: 'bat-mitzvah', label: 'Bat Mitzvah', icon: '✡️' },
  { value: 'confirmation', label: 'Confirmation', icon: '⛪' },
  { value: 'retirement', label: 'Retirement', icon: '🎉' },
  { value: 'immigration', label: 'Immigration', icon: '✈️' },
  { value: 'relocation', label: 'Relocation', icon: '🏡' },
  { value: 'military-service', label: 'Military Service', icon: '🎖️' },
  { value: 'achievement', label: 'Achievement', icon: '🏆' },
  { value: 'reunion', label: 'Family Reunion', icon: '👨‍👩‍👧‍👦' },
  { value: 'custom', label: 'Custom Event', icon: '📅' },
]

/**
 * Get Tailwind color classes for a gender value
 */
export function getGenderColor(genderValue: string): {
  bg: string
  text: string
  border: string
} {
  const option = GENDER_OPTIONS.find((opt) => opt.value === genderValue)
  const color = option?.color || 'gray'

  return {
    bg: `bg-${color}-100 dark:bg-${color}-900`,
    text: `text-${color}-700 dark:text-${color}-300`,
    border: `border-${color}-300 dark:border-${color}-700`,
  }
}

/**
 * Get display label for a gender value
 */
export function getGenderLabel(genderValue: string): string {
  const option = GENDER_OPTIONS.find((opt) => opt.value === genderValue)
  return (
    option?.label ||
    genderValue.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  )
}

/**
 * Get display label for an event type
 */
export function getEventTypeLabel(eventType: string): string {
  const option = EVENT_TYPES.find((opt) => opt.value === eventType)
  return (
    option?.label ||
    eventType.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  )
}

/**
 * Get icon for an event type
 */
export function getEventTypeIcon(eventType: string): string {
  const option = EVENT_TYPES.find((opt) => opt.value === eventType)
  return option?.icon || '📅'
}
