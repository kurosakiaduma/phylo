/**
 * RelationshipAnalyzer - Component for analyzing relationships between two family members
 */

'use client'

import { useState, useEffect } from 'react'
import { TreeMember } from '@/types/member'
import {
  useRelationshipAnalyzer,
  RelationshipResult,
} from '@/hooks/use-relationship-analyzer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import {
  Users,
  ArrowRight,
  Loader2,
  Heart,
  Baby,
  Crown,
  Network,
  Info,
  ArrowUpDown,
} from 'lucide-react'

interface RelationshipAnalyzerProps {
  members: TreeMember[]
  treeId: string
  selectedMember?: TreeMember | null
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  onMemberNavigate?: (member: TreeMember) => void
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

/**
 * Get relationship icon and color
 */
const getRelationshipIcon = (relationship: string) => {
  const rel = relationship.toLowerCase()

  if (
    rel.includes('spouse') ||
    rel.includes('husband') ||
    rel.includes('wife')
  ) {
    return { icon: Heart, color: 'text-red-500', bgColor: 'bg-red-50' }
  }
  if (
    rel.includes('parent') ||
    rel.includes('father') ||
    rel.includes('mother') ||
    rel.includes('grandparent')
  ) {
    return { icon: Crown, color: 'text-blue-500', bgColor: 'bg-blue-50' }
  }
  if (
    rel.includes('child') ||
    rel.includes('son') ||
    rel.includes('daughter') ||
    rel.includes('grandchild')
  ) {
    return { icon: Baby, color: 'text-green-500', bgColor: 'bg-green-50' }
  }
  if (
    rel.includes('sibling') ||
    rel.includes('brother') ||
    rel.includes('sister')
  ) {
    return { icon: Users, color: 'text-purple-500', bgColor: 'bg-purple-50' }
  }
  if (
    rel.includes('aunt') ||
    rel.includes('uncle') ||
    rel.includes('niece') ||
    rel.includes('nephew')
  ) {
    return { icon: Users, color: 'text-orange-500', bgColor: 'bg-orange-50' }
  }
  if (rel.includes('cousin')) {
    return { icon: Users, color: 'text-yellow-600', bgColor: 'bg-yellow-50' }
  }
  if (rel.includes('in-law') || rel.includes('step-')) {
    return { icon: Network, color: 'text-indigo-500', bgColor: 'bg-indigo-50' }
  }

  return { icon: Network, color: 'text-gray-500', bgColor: 'bg-gray-50' }
}

export function RelationshipAnalyzer({
  members,
  treeId,
  selectedMember,
  trigger,
  open,
  onOpenChange,
  onMemberNavigate,
}: RelationshipAnalyzerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [fromMember, setFromMember] = useState<string>(selectedMember?.id || '')
  const [toMember, setToMember] = useState<string>('')
  const { toast } = useToast()

  const { analyzeRelationship, loading, error, result, reset } =
    useRelationshipAnalyzer({ treeId })

  // Reset when selectedMember changes
  useEffect(() => {
    if (selectedMember && selectedMember.id !== fromMember) {
      setFromMember(selectedMember.id)
      reset()
    }
  }, [selectedMember?.id, fromMember, reset])

  const handleOpenChange = (newOpen: boolean) => {
    if (onOpenChange) {
      onOpenChange(newOpen)
    } else {
      setIsOpen(newOpen)
    }

    if (!newOpen) {
      // Only reset state when actually closing (not just re-rendering)
      // reset()
      // setFromMember(selectedMember?.id || '')
      // setToMember('')
    }
  }

  const handleAnalyzeRelationship = async () => {
    if (!fromMember || !toMember) {
      toast({
        title: 'Selection Required',
        description:
          'Please select both family members to analyze their relationship.',
        variant: 'destructive',
      })
      return
    }

    if (fromMember === toMember) {
      toast({
        title: 'Same Person',
        description: 'Please select two different family members.',
        variant: 'destructive',
      })
      return
    }

    try {
      const analysisResult = await analyzeRelationship(fromMember, toMember)

      if (analysisResult) {
        // Success - result will be displayed via the result state
        console.log('Relationship analysis successful:', analysisResult)
      }
    } catch (err) {
      // Handle any unexpected errors
      console.error('Unexpected error during analysis:', err)
      toast({
        title: 'Analysis Failed',
        description:
          'An unexpected error occurred while analyzing the relationship.',
        variant: 'destructive',
      })
    }
  }

  const swapMembers = () => {
    const temp = fromMember
    setFromMember(toMember)
    setToMember(temp)
    // Don't reset here - we want to keep the result if it exists
  }

  const handleFromMemberChange = (memberId: string) => {
    console.log('From member changed to:', memberId)
    setFromMember(memberId)
    // Only navigate when changing the "from" member, not "to" member
    const member = members.find((m) => m.id === memberId)
    if (member && onMemberNavigate) {
      onMemberNavigate(member)
    }
  }

  const handleToMemberChange = (memberId: string) => {
    console.log('To member changed to:', memberId)
    setToMember(memberId)
    // Don't navigate when changing the "to" member to avoid interference
    // The user can click on the member in the preview to navigate if needed
  }

  const fromMemberObj = members.find((m) => m.id === fromMember)
  const toMemberObj = members.find((m) => m.id === toMember)

  const dialogOpen = open !== undefined ? open : isOpen

  return (
    <>
      <style>{`
        /* Standardized z-index system for Relationship Analyzer */
        
        /* Dialog base layers */
        [data-radix-dialog-overlay][data-state="open"] {
          z-index: 50 !important;
        }
        [data-radix-dialog-content][data-state="open"] {
          z-index: 51 !important;
        }
        
        /* Select dropdowns - must be higher than dialog content */
        [data-radix-select-content] {
          z-index: 60 !important;
        }
        [data-radix-select-viewport] {
          z-index: 60 !important;
        }
        [data-radix-select-trigger] {
          z-index: 52 !important;
        }
        [data-radix-select-item] {
          z-index: 60 !important;
        }
        
        /* Portal elements */
        [data-radix-portal] [data-radix-select-content] {
          z-index: 60 !important;
        }
        [data-radix-popper-content-wrapper] {
          z-index: 60 !important;
        }
        
        /* Relationship analyzer specific selects */
        .relationship-analyzer-select [data-radix-select-content] {
          z-index: 60 !important;
        }
        
        /* Fullscreen mode adjustments */
        body:fullscreen [data-radix-dialog-overlay] {
          z-index: 50 !important;
        }
        body:fullscreen [data-radix-dialog-content] {
          z-index: 51 !important;
        }
        body:fullscreen [data-radix-select-content] {
          z-index: 60 !important;
        }
      `}</style>
      <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Network className="h-5 w-5" />
              Relationship Analyzer
            </DialogTitle>
            <DialogDescription>
              Discover the relationship between any two family members,
              including cousins, in-laws, and degrees of removal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Member Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">From Member</label>
                <SearchableSelect
                  key="from-member-select"
                  id="from-member-select"
                  value={fromMember}
                  onValueChange={handleFromMemberChange}
                  placeholder="Select first member"
                  searchPlaceholder="Search members..."
                  className="relationship-analyzer-select"
                  options={members.map((member) => ({
                    value: member.id,
                    label: member.name,
                  }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">To Member</label>
                <SearchableSelect
                  key="to-member-select"
                  id="to-member-select"
                  value={toMember}
                  onValueChange={handleToMemberChange}
                  placeholder="Select second member"
                  searchPlaceholder="Search members..."
                  className="relationship-analyzer-select"
                  options={members.map((member) => ({
                    value: member.id,
                    label: member.name,
                  }))}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button
                onClick={handleAnalyzeRelationship}
                disabled={!fromMember || !toMember || loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Network className="h-4 w-4 mr-2" />
                    Analyze Relationship
                  </>
                )}
              </Button>

              {fromMember && toMember && (
                <Button
                  variant="outline"
                  onClick={swapMembers}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <ArrowUpDown className="h-4 w-4" />
                  Swap
                </Button>
              )}
            </div>

            {/* Selected Members Preview */}
            {(fromMemberObj || toMemberObj) && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Selected Members</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    {fromMemberObj ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={
                              fromMemberObj.avatar_url
                                ? `${
                                    process.env.NEXT_PUBLIC_BACKEND_URL ||
                                    'http://localhost:8050'
                                  }${fromMemberObj.avatar_url}`
                                : undefined
                            }
                            alt={fromMemberObj.name}
                          />
                          <AvatarFallback
                            className={getGenderColor(fromMemberObj.gender)}
                          >
                            {getInitials(fromMemberObj.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {fromMemberObj.name}
                          </p>
                          {fromMemberObj.gender && (
                            <p className="text-xs text-muted-foreground">
                              {fromMemberObj.gender}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Select first member
                      </div>
                    )}

                    <ArrowRight className="h-4 w-4 text-muted-foreground" />

                    {toMemberObj ? (
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={
                              toMemberObj.avatar_url
                                ? `${
                                    process.env.NEXT_PUBLIC_BACKEND_URL ||
                                    'http://localhost:8050'
                                  }${toMemberObj.avatar_url}`
                                : undefined
                            }
                            alt={toMemberObj.name}
                          />
                          <AvatarFallback
                            className={getGenderColor(toMemberObj.gender)}
                          >
                            {getInitials(toMemberObj.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">
                            {toMemberObj.name}
                          </p>
                          {toMemberObj.gender && (
                            <p className="text-xs text-muted-foreground">
                              {toMemberObj.gender}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Select second member
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Display */}
            {error && !loading && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-red-700">
                    <Info className="h-4 w-4" />
                    <p className="text-sm font-medium">Analysis Error</p>
                  </div>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Results */}
            {result && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Relationship Analysis
                  </CardTitle>
                  <CardDescription>
                    Bidirectional relationship between the selected members
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Primary Relationship */}
                  <div className="text-center space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      <div className="text-center">
                        <p className="font-medium">{result.from_member_name}</p>
                        <p className="text-xs text-muted-foreground">is the</p>
                      </div>

                      <div className="flex items-center gap-2">
                        {(() => {
                          const {
                            icon: Icon,
                            color,
                            bgColor,
                          } = getRelationshipIcon(result.relationship)
                          return (
                            <Badge
                              variant="outline"
                              className={`${bgColor} ${color} border-current px-3 py-1`}
                            >
                              <Icon className="h-3 w-3 mr-1" />
                              {result.relationship}
                            </Badge>
                          )
                        })()}
                      </div>

                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">of</p>
                        <p className="font-medium">{result.to_member_name}</p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Reverse Relationship */}
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Conversely:</p>
                    <p className="text-sm">
                      <span className="font-medium">
                        {result.to_member_name}
                      </span>{' '}
                      is the{' '}
                      <Badge variant="secondary" className="mx-1">
                        {getReverseRelationship(
                          result.relationship,
                          toMemberObj?.gender,
                        )}
                      </Badge>{' '}
                      of{' '}
                      <span className="font-medium">
                        {result.from_member_name}
                      </span>
                    </p>
                  </div>

                  {/* Relationship Path */}
                  {result.path_names.length > 2 && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <p className="text-sm font-medium">
                          Relationship Path:
                        </p>
                        <div className="flex flex-wrap items-center gap-1 text-xs">
                          {result.path_names.map((name, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-1"
                            >
                              <Badge variant="outline" className="text-xs">
                                {name}
                              </Badge>
                              {index < result.path_names.length - 1 && (
                                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Maternal/Paternal Information */}
                  {(result.relationship.includes('cousin') ||
                    result.relationship.includes('aunt') ||
                    result.relationship.includes('uncle') ||
                    result.relationship.includes('niece') ||
                    result.relationship.includes('nephew')) && (
                    <>
                      <Separator />
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="text-xs text-blue-700 font-medium mb-1">
                          Family Line Information:
                        </p>
                        <p className="text-xs text-blue-600">
                          {getMaternalPaternalInfo(result.path_names, members)}
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

/**
 * Get the reverse relationship
 */
function getReverseRelationship(relationship: string, gender?: string): string {
  const rel = relationship.toLowerCase()
  const isMale = gender?.toLowerCase() === 'male'
  const isFemale = gender?.toLowerCase() === 'female'

  // Direct relationships
  if (rel === 'spouse') return 'spouse'
  if (rel === 'parent') return isMale ? 'son' : isFemale ? 'daughter' : 'child'
  if (rel === 'child') return isMale ? 'father' : isFemale ? 'mother' : 'parent'
  if (rel === 'father') return isMale ? 'son' : isFemale ? 'daughter' : 'child'
  if (rel === 'mother') return isMale ? 'son' : isFemale ? 'daughter' : 'child'
  if (rel === 'son' || rel === 'daughter')
    return isMale ? 'father' : isFemale ? 'mother' : 'parent'

  // Siblings
  if (rel === 'sibling')
    return isMale ? 'brother' : isFemale ? 'sister' : 'sibling'
  if (rel === 'brother' || rel === 'sister')
    return isMale ? 'brother' : isFemale ? 'sister' : 'sibling'

  // Grandparents/Grandchildren - the reverse relationship logic (including great- prefixes)
  if (
    rel.includes('grandparent') ||
    rel === 'grandfather' ||
    rel === 'grandmother'
  ) {
    // Handle great-grandparent
    if (rel.includes('great-')) {
      const prefix = rel.match(/^(great-)+/)?.[0] || ''
      return isMale
        ? `${prefix}grandson`
        : isFemale
        ? `${prefix}granddaughter`
        : `${prefix}grandchild`
    }
    return isMale ? 'grandson' : isFemale ? 'granddaughter' : 'grandchild'
  }
  if (
    rel.includes('grandchild') ||
    rel === 'grandson' ||
    rel === 'granddaughter'
  ) {
    // Handle great-grandchild
    if (rel.includes('great-')) {
      const prefix = rel.match(/^(great-)+/)?.[0] || ''
      return isMale
        ? `${prefix}grandfather`
        : isFemale
        ? `${prefix}grandmother`
        : `${prefix}grandparent`
    }
    return isMale ? 'grandfather' : isFemale ? 'grandmother' : 'grandparent'
  }

  // Aunts/Uncles and Nieces/Nephews (including great- prefixes)
  if (rel.includes('aunt') || rel.includes('uncle')) {
    // Handle great-aunt/great-uncle
    if (rel.includes('great-')) {
      const prefix = rel.match(/^(great-)+/)?.[0] || ''
      return isMale
        ? `${prefix}nephew`
        : isFemale
        ? `${prefix}niece`
        : `${prefix}niece/nephew`
    }
    return isMale ? 'nephew' : isFemale ? 'niece' : 'niece/nephew'
  }
  if (rel.includes('niece') || rel.includes('nephew')) {
    // Handle great-niece/great-nephew
    if (rel.includes('great-')) {
      const prefix = rel.match(/^(great-)+/)?.[0] || ''
      return isMale
        ? `${prefix}uncle`
        : isFemale
        ? `${prefix}aunt`
        : `${prefix}aunt/uncle`
    }
    return isMale ? 'uncle' : isFemale ? 'aunt' : 'aunt/uncle'
  }

  // Cousins are symmetric
  if (rel.includes('cousin')) return relationship

  // Step relationships
  if (rel.includes('step-child'))
    return isMale ? 'step-father' : isFemale ? 'step-mother' : 'step-parent'
  if (rel.includes('step-parent'))
    return isMale ? 'step-son' : isFemale ? 'step-daughter' : 'step-child'

  // In-laws
  if (rel.includes('in-law')) {
    if (rel.includes('parent'))
      return isMale
        ? 'son-in-law'
        : isFemale
        ? 'daughter-in-law'
        : 'child-in-law'
    if (rel.includes('child'))
      return isMale
        ? 'father-in-law'
        : isFemale
        ? 'mother-in-law'
        : 'parent-in-law'
    if (rel.includes('sibling'))
      return isMale
        ? 'brother-in-law'
        : isFemale
        ? 'sister-in-law'
        : 'sibling-in-law'
  }

  return relationship
}

/**
 * Determine if relationship is through maternal or paternal line
 */
function getMaternalPaternalInfo(
  pathNames: string[],
  members: TreeMember[],
): string {
  if (pathNames.length < 3) return 'Direct relationship'

  // This is a simplified version - in a full implementation, you'd analyze
  // the actual relationship path to determine maternal vs paternal lines
  return 'Relationship path shows the family connection through shared ancestors'
}
