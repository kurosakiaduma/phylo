/**
 * TreeMemberCard - Displays a member node with spouse(s) in the tree
 */

'use client'

import { useRef, useEffect } from 'react'
import { TreeMember } from '@/types/member'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Heart } from 'lucide-react'
import { gsap } from 'gsap'
import clsx from 'clsx'

interface TreeMemberCardProps {
  member: TreeMember
  spouses: TreeMember[]
  isSelected?: boolean
  isHighlighted?: boolean
  onClick?: (e?: React.MouseEvent) => void
  onMemberClick?: (member: TreeMember) => void
  selectedMemberId?: string // Add this to check spouse selection
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
 * Single person card
 */
function PersonCard({
  member,
  isSelected,
  isHighlighted,
  onClick,
}: {
  member: TreeMember
  isSelected?: boolean
  isHighlighted?: boolean
  onClick?: (e?: React.MouseEvent) => void
}) {
  const cardRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!cardRef.current) return

    // Entrance animation
    gsap.fromTo(
      cardRef.current,
      {
        opacity: 0,
        scale: 0.8,
        y: 20,
      },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.6,
        ease: 'back.out(1.7)',
        delay: Math.random() * 0.3, // Stagger entrance
      },
    )

    // Hover animations
    const handleMouseEnter = () => {
      gsap.to(cardRef.current, {
        scale: 1.05,
        y: -2,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      gsap.to(cardRef.current, {
        scale: 1,
        y: 0,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const card = cardRef.current
    card.addEventListener('mouseenter', handleMouseEnter)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter)
      card.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  // Selection animation
  useEffect(() => {
    if (!cardRef.current) return

    if (isSelected) {
      gsap.to(cardRef.current, {
        scale: 1.08,
        duration: 0.3,
        ease: 'power2.out',
      })
    } else {
      gsap.to(cardRef.current, {
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      })
    }
  }, [isSelected])

  return (
    <div className="relative inline-block" style={{ zIndex: 10 }}>
      <Card
        ref={cardRef}
        className={clsx(
          'min-w-[100px] cursor-pointer transition-all hover:shadow-lg bg-white dark:bg-slate-800',
          isSelected && 'ring-2 ring-blue-500 ring-offset-2',
          isHighlighted && 'ring-2 ring-yellow-400 ring-offset-2',
          member.deceased && 'opacity-75',
        )}
        onClick={(e) => onClick?.(e)}
      >
        <div className="flex flex-col items-center gap-2 p-3">
          <Avatar className="h-14 w-14">
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
          <div className="text-center">
            <p
              className={clsx(
                'text-sm font-medium leading-tight',
                member.deceased && 'line-through',
              )}
            >
              {member.name}
            </p>
            {member.dob && (
              <p className="text-xs text-muted-foreground">
                b. {new Date(member.dob).getFullYear()}
              </p>
            )}
            {member.deceased && member.dod && (
              <p className="text-xs text-muted-foreground">
                d. {new Date(member.dod).getFullYear()}
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * Member card with spouse(s)
 */
export function TreeMemberCard({
  member,
  spouses,
  isSelected,
  isHighlighted,
  onClick,
  onMemberClick,
  selectedMemberId,
}: TreeMemberCardProps) {
  const coupleCardRef = useRef<HTMLDivElement>(null)
  const heartRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    if (!coupleCardRef.current || spouses.length === 0) return

    // Entrance animation for couple card
    gsap.fromTo(
      coupleCardRef.current,
      {
        opacity: 0,
        scale: 0.9,
        y: 15,
      },
      {
        opacity: 1,
        scale: 1,
        y: 0,
        duration: 0.7,
        ease: 'back.out(1.4)',
        delay: Math.random() * 0.4,
      },
    )

    // Animate hearts with gentle pulsing
    heartRefs.current.forEach((heart, index) => {
      if (heart) {
        gsap.fromTo(
          heart,
          { scale: 0, rotation: -180 },
          {
            scale: 1,
            rotation: 0,
            duration: 0.5,
            ease: 'back.out(2)',
            delay: 0.3 + index * 0.1,
          },
        )

        // Gentle continuous pulse
        gsap.to(heart, {
          scale: 1.1,
          duration: 2,
          ease: 'power2.inOut',
          yoyo: true,
          repeat: -1,
          delay: 1 + index * 0.2,
        })
      }
    })

    // Hover animation for the whole couple card
    const handleMouseEnter = () => {
      gsap.to(coupleCardRef.current, {
        scale: 1.02,
        y: -1,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const handleMouseLeave = () => {
      gsap.to(coupleCardRef.current, {
        scale: 1,
        y: 0,
        duration: 0.3,
        ease: 'power2.out',
      })
    }

    const card = coupleCardRef.current
    card.addEventListener('mouseenter', handleMouseEnter)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mouseenter', handleMouseEnter)
      card.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [spouses.length])

  if (spouses.length === 0) {
    return (
      <PersonCard
        member={member}
        isSelected={isSelected}
        isHighlighted={isHighlighted}
        onClick={onClick}
      />
    )
  }

  // Show member with spouse(s)
  return (
    <Card
      ref={coupleCardRef}
      className="inline-block border-2 p-2 bg-white dark:bg-slate-800"
      style={{ zIndex: 10 }}
    >
      <div className="flex items-center gap-2">
        {/* Primary member */}
        <div
          className={clsx(
            'cursor-pointer rounded-lg p-2 transition-all hover:bg-accent',
            isSelected && 'ring-2 ring-blue-500',
            isHighlighted && 'ring-2 ring-yellow-400',
          )}
          onClick={(e) => onClick?.(e)}
        >
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-14 w-14">
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
            <div className="text-center">
              <p
                className={clsx(
                  'text-sm font-medium leading-tight',
                  member.deceased && 'line-through',
                )}
              >
                {member.name}
              </p>
              {member.dob && (
                <p className="text-xs text-muted-foreground">
                  b. {new Date(member.dob).getFullYear()}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Heart divider */}
        {spouses.length > 0 && (
          <div
            ref={(el) => {
              heartRefs.current[0] = el
            }}
          >
            <Heart className="h-4 w-4 flex-shrink-0 fill-red-400 text-red-400" />
          </div>
        )}

        {/* Spouses */}
        {spouses.map((spouse, index) => (
          <div key={spouse.id} className="flex items-center gap-2">
            <div
              className={clsx(
                'cursor-pointer rounded-lg p-2 transition-all hover:bg-accent',
                selectedMemberId === spouse.id && 'ring-2 ring-blue-500',
                isHighlighted && 'ring-2 ring-yellow-400',
              )}
              onClick={(e) => {
                e.stopPropagation()
                // Use the same onClick handler as the primary member for consistency
                if (onMemberClick) {
                  onMemberClick(spouse)
                } else if (onClick) {
                  // Fallback to onClick if onMemberClick is not available
                  onClick(e)
                }
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <Avatar className="h-14 w-14">
                  <AvatarImage
                    src={
                      spouse.avatar_url
                        ? `${
                            process.env.NEXT_PUBLIC_BACKEND_URL ||
                            'http://localhost:8050'
                          }${spouse.avatar_url}`
                        : undefined
                    }
                    alt={spouse.name}
                  />
                  <AvatarFallback className={getGenderColor(spouse.gender)}>
                    {getInitials(spouse.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <p
                    className={clsx(
                      'text-sm font-medium leading-tight',
                      spouse.deceased && 'line-through',
                    )}
                  >
                    {spouse.name}
                  </p>
                  {spouse.dob && (
                    <p className="text-xs text-muted-foreground">
                      b. {new Date(spouse.dob).getFullYear()}
                    </p>
                  )}
                </div>
              </div>
            </div>
            {index < spouses.length - 1 && (
              <div
                ref={(el) => {
                  heartRefs.current[index + 1] = el
                }}
              >
                <Heart className="h-4 w-4 flex-shrink-0 fill-red-400 text-red-400" />
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}
