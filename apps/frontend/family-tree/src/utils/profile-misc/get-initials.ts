export function getInitials(
  displayName: string | null | undefined,
  email: string | undefined,
): string {
  if (displayName) {
    const parts = displayName.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
    }
    return displayName.slice(0, 2).toUpperCase()
  }
  return email ? email.slice(0, 2).toUpperCase() : '??'
}
