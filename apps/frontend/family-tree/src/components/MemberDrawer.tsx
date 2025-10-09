/**
 * MemberDrawer - Side drawer for viewing/editing member details
 */

'use client'

import { TreeMember } from '@/types/member'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { RelationshipAnalyzer } from '@/components/RelationshipAnalyzer'
import {
  User,
  Mail,
  Calendar,
  MapPin,
  Briefcase,
  Heart,
  Users,
  Network,
} from 'lucide-react'

interface MemberDrawerProps {
  member: TreeMember | null
  open: boolean
  onOpenChange: (open: boolean) => void
  allMembers: TreeMember[]
  treeId?: string
  onEditClick?: () => void
  onAddSpouseClick?: () => void
  onAddChildClick?: () => void
  onAddParentClick?: () => void
  onMemberNavigate?: (member: TreeMember) => void // New prop for member navigation
  isTreeCanvasPage?: boolean // New prop to determine if we're on tree canvas page
}

/**
 * Get initials from name
 */
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Get gender-based color
 */
const getGenderColor = (gender?: string): string => {
  if (!gender) return 'bg-gray-400'
  const g = gender.toLowerCase()
  if (g === 'male') return 'bg-blue-400'
  if (g === 'female') return 'bg-pink-400'
  return 'bg-purple-400'
}

export function MemberDrawer({
  member,
  open,
  onOpenChange,
  allMembers,
  treeId,
  onEditClick,
  onAddSpouseClick,
  onAddChildClick,
  onAddParentClick,
  onMemberNavigate,
  isTreeCanvasPage = false,
}: MemberDrawerProps) {
  if (!member) return null

  const spouses = member.spouseIds
    .map((id) => allMembers.find((m) => m.id === id))
    .filter((m): m is TreeMember => m !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name))

  const parents = member.parentIds
    .map((id) => allMembers.find((m) => m.id === id))
    .filter((m): m is TreeMember => m !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name))

  const children = member.childIds
    .map((id) => allMembers.find((m) => m.id === id))
    .filter((m): m is TreeMember => m !== undefined)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <>
      <style>{`
        /* Standardized z-index system for Member Drawer */
        
        /* Sheet base layers */
        [data-radix-sheet-overlay] {
          z-index: 40 !important;
        }
        [data-radix-sheet-content] {
          z-index: 41 !important;
        }
        
        /* Fullscreen mode adjustments */
        body:fullscreen [data-radix-sheet-overlay] {
          z-index: 40 !important;
        }
        body:fullscreen [data-radix-sheet-content] {
          z-index: 41 !important;
        }
      `}</style>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg flex flex-col max-h-screen">
          <SheetHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 flex-shrink-0">
                <AvatarImage
                  src={
                    member.avatar_url
                      ? `${
                          process.env.NEXT_PUBLIC_BACKEND_URL ||
                          'http://localhost:8050'
                        }${member.avatar_url}`
                      : undefined
                  }
                  alt={member.name}
                />
                <AvatarFallback className={getGenderColor(member.gender)}>
                  {getInitials(member.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl sm:text-2xl">
                  {member.name}
                </SheetTitle>
                <SheetDescription className="text-sm">
                  {member.deceased ? 'Deceased' : 'Living'}
                  {member.gender && ` • ${member.gender}`}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Quick Actions - positioned prominently below header */}
          <div className="grid grid-cols-2 gap-2 mt-4 px-1">
            <Button
              size="sm"
              variant="outline"
              onClick={onEditClick}
              className="text-xs h-9"
            >
              Edit Member
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddParentClick}
              className="text-xs h-9"
            >
              Add Parent
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddSpouseClick}
              className="text-xs h-9"
            >
              Add Spouse
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onAddChildClick}
              className="text-xs h-9"
            >
              Add Child
            </Button>
          </div>

          {/* Relationship Analyzer */}
          {treeId && allMembers.length > 1 && (
            <div className="mt-3 px-1">
              <RelationshipAnalyzer
                members={allMembers}
                treeId={treeId}
                selectedMember={member}
                onMemberNavigate={
                  isTreeCanvasPage ? onMemberNavigate : undefined
                }
                trigger={
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full text-xs h-9"
                  >
                    <Network className="h-3 w-3 mr-2" />
                    Analyze Relationships
                  </Button>
                }
              />
            </div>
          )}

          <div className="mt-4 space-y-6 flex-1 overflow-y-auto pb-6">
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              {member.deceased && <Badge variant="secondary">Deceased</Badge>}
              {member.gender && (
                <Badge variant="outline">{member.gender}</Badge>
              )}
              {member.pronouns && (
                <Badge variant="outline">{member.pronouns}</Badge>
              )}
            </div>

            <Separator />

            {/* Basic info */}
            <div className="space-y-3">
              <h3 className="font-semibold">Information</h3>

              {member.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{member.email}</span>
                </div>
              )}

              {member.dob && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Born: {member.dob}
                    {member.birth_place && ` in ${member.birth_place}`}
                  </span>
                </div>
              )}

              {member.deceased && member.dod && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    Died: {member.dod}
                    {member.death_place && ` in ${member.death_place}`}
                  </span>
                </div>
              )}

              {member.occupation && (
                <div className="flex items-center gap-2 text-sm">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{member.occupation}</span>
                </div>
              )}
            </div>

            {/* Bio */}
            {member.bio && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Biography</h3>
                  <p className="text-sm text-muted-foreground">{member.bio}</p>
                </div>
              </>
            )}

            {/* Relationships */}
            <Separator />
            <div className="space-y-3">
              <h3 className="font-semibold">Relationships</h3>

              {parents.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Parents
                  </p>
                  <div className="space-y-1">
                    {parents.map((parent) => (
                      <div
                        key={parent.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Users className="h-3 w-3" />
                        {onMemberNavigate ? (
                          <button
                            onClick={() => onMemberNavigate(parent)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {parent.name}
                          </button>
                        ) : (
                          <span>{parent.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {spouses.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    {spouses.length === 1 ? 'Spouse' : 'Spouses'}
                  </p>
                  <div className="space-y-1">
                    {spouses.map((spouse) => (
                      <div
                        key={spouse.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Heart className="h-3 w-3 fill-red-400 text-red-400" />
                        {onMemberNavigate ? (
                          <button
                            onClick={() => onMemberNavigate(spouse)}
                            className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                          >
                            {spouse.name}
                          </button>
                        ) : (
                          <span>{spouse.name}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {children.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Children
                  </p>
                  <div className="space-y-1">
                    {children.map((child) => {
                      // Check if child is shared with any spouse
                      const sharedWithSpouses = spouses.filter((spouse) =>
                        child.parentIds.includes(spouse.id),
                      )

                      return (
                        <div
                          key={child.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3" />
                            {onMemberNavigate ? (
                              <button
                                onClick={() => onMemberNavigate(child)}
                                className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                              >
                                {child.name}
                              </button>
                            ) : (
                              <span>{child.name}</span>
                            )}
                          </div>
                          {sharedWithSpouses.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              with{' '}
                              {sharedWithSpouses.map((s, index) => (
                                <span key={s.id}>
                                  {index > 0 && ', '}
                                  {onMemberNavigate ? (
                                    <button
                                      onClick={() => onMemberNavigate(s)}
                                      className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                                    >
                                      {s.name}
                                    </button>
                                  ) : (
                                    s.name
                                  )}
                                </span>
                              ))}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Notes */}
            {member.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h3 className="font-semibold">Notes</h3>
                  <p className="text-sm text-muted-foreground">
                    {member.notes}
                  </p>
                </div>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
