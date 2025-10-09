'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useToast } from '@/hooks/use-toast'
import { useTreeMembers } from '@/hooks/use-tree-members'
import { ArrowLeft, Calendar, Gift, Heart, Loader2, Plus } from 'lucide-react'

interface Tree {
  id: string
  name: string
  description?: string
  role: 'custodian' | 'contributor' | 'viewer'
}

interface FamilyEvent {
  id: string
  member_id: string
  member_name: string
  event_type: 'birthday' | 'death_anniversary' | 'marriage_anniversary'
  date: string
  recurring: boolean
  notes?: string
}

export default function EventsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [tree, setTree] = useState<Tree | null>(null)
  const [events, setEvents] = useState<FamilyEvent[]>([])
  const [loading, setLoading] = useState(true)

  const treeId = params.id as string

  // Fetch tree members for event generation
  const { members } = useTreeMembers({ treeId, autoFetch: true })

  useEffect(() => {
    fetchTreeAndEvents()
  }, [treeId])

  const fetchTreeAndEvents = async () => {
    try {
      setLoading(true)

      // Fetch tree details
      const treeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trees/${treeId}`,
        { credentials: 'include' },
      )

      if (!treeResponse.ok) {
        throw new Error('Failed to fetch tree')
      }

      const treeData = await treeResponse.json()
      setTree(treeData)

      // Generate events from member data (birthdays and death anniversaries)
      generateEventsFromMembers()
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to load events. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const generateEventsFromMembers = () => {
    const generatedEvents: FamilyEvent[] = []

    members.forEach((member) => {
      // Birthday events
      if (member.dob) {
        generatedEvents.push({
          id: `birthday-${member.id}`,
          member_id: member.id,
          member_name: member.name,
          event_type: 'birthday',
          date: member.dob,
          recurring: true,
          notes: `${member.name}'s birthday`,
        })
      }

      // Death anniversary events
      if (member.dod && member.deceased) {
        generatedEvents.push({
          id: `death-${member.id}`,
          member_id: member.id,
          member_name: member.name,
          event_type: 'death_anniversary',
          date: member.dod,
          recurring: true,
          notes: `${member.name}'s death anniversary`,
        })
      }
    })

    // Sort events by date (month/day)
    generatedEvents.sort((a, b) => {
      const dateA = new Date(a.date)
      const dateB = new Date(b.date)
      const monthDayA = dateA.getMonth() * 100 + dateA.getDate()
      const monthDayB = dateB.getMonth() * 100 + dateB.getDate()
      return monthDayA - monthDayB
    })

    setEvents(generatedEvents)
  }

  useEffect(() => {
    if (members.length > 0) {
      generateEventsFromMembers()
    }
  }, [members])

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'birthday':
        return <Gift className="h-4 w-4" />
      case 'death_anniversary':
        return <Calendar className="h-4 w-4" />
      case 'marriage_anniversary':
        return <Heart className="h-4 w-4" />
      default:
        return <Calendar className="h-4 w-4" />
    }
  }

  const getEventColor = (eventType: string) => {
    switch (eventType) {
      case 'birthday':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'death_anniversary':
        return 'bg-gray-100 text-gray-800 border-gray-200'
      case 'marriage_anniversary':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    })
  }

  const getUpcomingEvents = () => {
    const today = new Date()
    const currentMonth = today.getMonth()
    const currentDay = today.getDate()

    return events.filter((event) => {
      const eventDate = new Date(event.date)
      const eventMonth = eventDate.getMonth()
      const eventDay = eventDate.getDate()

      // Show events in the next 30 days (considering year rollover)
      const eventThisYear = new Date(today.getFullYear(), eventMonth, eventDay)
      const eventNextYear = new Date(
        today.getFullYear() + 1,
        eventMonth,
        eventDay,
      )

      const daysUntilThisYear = Math.ceil(
        (eventThisYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      )
      const daysUntilNextYear = Math.ceil(
        (eventNextYear.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      )

      return (
        (daysUntilThisYear >= 0 && daysUntilThisYear <= 30) ||
        (daysUntilNextYear >= 0 && daysUntilNextYear <= 30)
      )
    })
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading events...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!tree) {
    return null
  }

  const upcomingEvents = getUpcomingEvents()

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/trees/${treeId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Tree
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Family Events</h1>
            <p className="text-muted-foreground">
              {tree.name} • {events.length} events tracked
            </p>
          </div>
        </div>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Upcoming Events (Next 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  No Upcoming Events
                </h3>
                <p className="text-muted-foreground">
                  No family events in the next 30 days. Add birth dates and
                  other important dates to see events here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${getEventColor(
                          event.event_type,
                        )}`}
                      >
                        {getEventIcon(event.event_type)}
                      </div>
                      <div>
                        <p className="font-medium">{event.member_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {event.event_type
                            .replace('_', ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatEventDate(event.date)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {event.recurring ? 'Annual' : 'One-time'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* All Events */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              All Family Events
            </CardTitle>
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Events are automatically generated from member birth dates and
                  death dates. Add these dates to family members to see events
                  here.
                </p>
                <Button onClick={() => router.push(`/trees/${treeId}/members`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Manage Members
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${getEventColor(
                          event.event_type,
                        )}`}
                      >
                        {getEventIcon(event.event_type)}
                      </div>
                      <div>
                        <p className="font-medium">{event.member_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {event.event_type
                            .replace('_', ' ')
                            .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </p>
                        {event.notes && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {event.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatEventDate(event.date)}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {event.recurring ? 'Annual' : 'One-time'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Total Events
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{events.length}</div>
              <p className="text-xs text-muted-foreground">
                Family events tracked
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Birthdays</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {events.filter((e) => e.event_type === 'birthday').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Birthday celebrations
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Anniversaries
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {
                  events.filter((e) => e.event_type === 'death_anniversary')
                    .length
                }
              </div>
              <p className="text-xs text-muted-foreground">Memorial dates</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
