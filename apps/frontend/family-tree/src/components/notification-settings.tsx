'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/use-auth'
import {
  Bell,
  Loader2,
  ChevronRight,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react'

interface GlobalPreferences {
  id: string
  email_notifications_enabled: boolean
  weekly_digest_enabled: boolean
  push_notifications_enabled: boolean
  digest_day_of_week: number
}

interface TreeNotificationSettings {
  id: string
  tree_id: string
  tree_name: string
  events_enabled: boolean
  birthdays_enabled: boolean
  death_anniversaries_enabled: boolean
  gallery_updates_enabled: boolean
  member_updates_enabled: boolean
}

export function NotificationSettings() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [globalPreferences, setGlobalPreferences] =
    useState<GlobalPreferences | null>(null)
  const [treeSettings, setTreeSettings] = useState<TreeNotificationSettings[]>(
    [],
  )
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user) {
      fetchNotificationSettings()
    }
  }, [user])

  const fetchNotificationSettings = async () => {
    try {
      setIsLoading(true)

      // Fetch global preferences
      const globalResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/global-preferences`,
        { credentials: 'include' },
      )

      if (globalResponse.ok) {
        const globalData = await globalResponse.json()
        setGlobalPreferences(globalData)
      }

      // Fetch tree-specific settings
      const treeResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/settings`,
        { credentials: 'include' },
      )

      if (treeResponse.ok) {
        const treeData = await treeResponse.json()
        setTreeSettings(treeData)
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to load notification settings.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateGlobalPreferences = async (
    field: keyof GlobalPreferences,
    value: boolean | number,
  ) => {
    if (!globalPreferences) return

    try {
      setIsSaving(true)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/global-preferences`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ [field]: value }),
        },
      )

      if (!response.ok) throw new Error('Failed to update preferences')

      const updatedPreferences = await response.json()
      setGlobalPreferences(updatedPreferences)

      toast({
        title: 'Settings Updated',
        description: 'Your notification preferences have been saved.',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update notification preferences.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const updateTreeSettings = async (
    treeId: string,
    field: string,
    value: boolean,
  ) => {
    try {
      setIsSaving(true)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/settings/${treeId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ [field]: value }),
        },
      )

      if (!response.ok) throw new Error('Failed to update tree settings')

      const updatedSettings = await response.json()

      // Update the tree settings in state
      setTreeSettings((prev) =>
        prev.map((setting) =>
          setting.tree_id === treeId ? updatedSettings : setting,
        ),
      )

      toast({
        title: 'Settings Updated',
        description: `Notification settings updated for ${updatedSettings.tree_name}.`,
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update tree notification settings.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const toggleAllForColumn = (field: string, enable: boolean) => {
    treeSettings.forEach((setting) => {
      updateTreeSettings(setting.tree_id, field, enable)
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Notifications
        </CardTitle>
        <CardDescription>
          Configure how you receive notifications globally and per tree
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Global Settings */}
        {globalPreferences && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">Global Settings</h3>
            </div>

            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates about your account
                  </p>
                </div>
                <Switch
                  checked={globalPreferences.email_notifications_enabled}
                  onCheckedChange={(checked) =>
                    updateGlobalPreferences(
                      'email_notifications_enabled',
                      checked,
                    )
                  }
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Weekly Digest</Label>
                  <p className="text-sm text-muted-foreground">
                    Get a weekly summary of activity across all your trees
                  </p>
                </div>
                <Switch
                  checked={globalPreferences.weekly_digest_enabled}
                  onCheckedChange={(checked) =>
                    updateGlobalPreferences('weekly_digest_enabled', checked)
                  }
                  disabled={isSaving}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive browser push notifications for important updates
                  </p>
                </div>
                <Switch
                  checked={globalPreferences.push_notifications_enabled}
                  onCheckedChange={(checked) =>
                    updateGlobalPreferences(
                      'push_notifications_enabled',
                      checked,
                    )
                  }
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Tree-Specific Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Tree Notifications</h3>
            <p className="text-sm text-muted-foreground">
              Scroll right to see all options →
            </p>
          </div>

          {treeSettings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No trees found</p>
              <p className="text-sm">
                Join or create a tree to configure notifications
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium min-w-[200px] sticky left-0 bg-muted/50">
                        Tree Name
                      </th>
                      <th className="text-center p-4 font-medium min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>Events</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() =>
                              toggleAllForColumn('events_enabled', true)
                            }
                          >
                            All On
                          </Button>
                        </div>
                      </th>
                      <th className="text-center p-4 font-medium min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>Birthdays</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() =>
                              toggleAllForColumn('birthdays_enabled', true)
                            }
                          >
                            All On
                          </Button>
                        </div>
                      </th>
                      <th className="text-center p-4 font-medium min-w-[140px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>Anniversaries</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() =>
                              toggleAllForColumn(
                                'death_anniversaries_enabled',
                                true,
                              )
                            }
                          >
                            All On
                          </Button>
                        </div>
                      </th>
                      <th className="text-center p-4 font-medium min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>Gallery</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() =>
                              toggleAllForColumn(
                                'gallery_updates_enabled',
                                true,
                              )
                            }
                          >
                            All On
                          </Button>
                        </div>
                      </th>
                      <th className="text-center p-4 font-medium min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span>Members</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() =>
                              toggleAllForColumn('member_updates_enabled', true)
                            }
                          >
                            All On
                          </Button>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {treeSettings.map((setting) => (
                      <tr key={setting.tree_id} className="border-t">
                        <td className="p-4 font-medium sticky left-0 bg-background">
                          {setting.tree_name}
                        </td>
                        <td className="p-4 text-center">
                          <Switch
                            checked={setting.events_enabled}
                            onCheckedChange={(checked) =>
                              updateTreeSettings(
                                setting.tree_id,
                                'events_enabled',
                                checked,
                              )
                            }
                            disabled={isSaving}
                          />
                        </td>
                        <td className="p-4 text-center">
                          <Switch
                            checked={setting.birthdays_enabled}
                            onCheckedChange={(checked) =>
                              updateTreeSettings(
                                setting.tree_id,
                                'birthdays_enabled',
                                checked,
                              )
                            }
                            disabled={isSaving}
                          />
                        </td>
                        <td className="p-4 text-center">
                          <Switch
                            checked={setting.death_anniversaries_enabled}
                            onCheckedChange={(checked) =>
                              updateTreeSettings(
                                setting.tree_id,
                                'death_anniversaries_enabled',
                                checked,
                              )
                            }
                            disabled={isSaving}
                          />
                        </td>
                        <td className="p-4 text-center">
                          <Switch
                            checked={setting.gallery_updates_enabled}
                            onCheckedChange={(checked) =>
                              updateTreeSettings(
                                setting.tree_id,
                                'gallery_updates_enabled',
                                checked,
                              )
                            }
                            disabled={isSaving}
                          />
                        </td>
                        <td className="p-4 text-center">
                          <Switch
                            checked={setting.member_updates_enabled}
                            onCheckedChange={(checked) =>
                              updateTreeSettings(
                                setting.tree_id,
                                'member_updates_enabled',
                                checked,
                              )
                            }
                            disabled={isSaving}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4 p-4">
                {treeSettings.map((setting) => (
                  <Card key={setting.tree_id}>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">
                        {setting.tree_name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Events</Label>
                        <Switch
                          checked={setting.events_enabled}
                          onCheckedChange={(checked) =>
                            updateTreeSettings(
                              setting.tree_id,
                              'events_enabled',
                              checked,
                            )
                          }
                          disabled={isSaving}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Birthdays</Label>
                        <Switch
                          checked={setting.birthdays_enabled}
                          onCheckedChange={(checked) =>
                            updateTreeSettings(
                              setting.tree_id,
                              'birthdays_enabled',
                              checked,
                            )
                          }
                          disabled={isSaving}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Death Anniversaries</Label>
                        <Switch
                          checked={setting.death_anniversaries_enabled}
                          onCheckedChange={(checked) =>
                            updateTreeSettings(
                              setting.tree_id,
                              'death_anniversaries_enabled',
                              checked,
                            )
                          }
                          disabled={isSaving}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Gallery Updates</Label>
                        <Switch
                          checked={setting.gallery_updates_enabled}
                          onCheckedChange={(checked) =>
                            updateTreeSettings(
                              setting.tree_id,
                              'gallery_updates_enabled',
                              checked,
                            )
                          }
                          disabled={isSaving}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label className="text-sm">Member Updates</Label>
                        <Switch
                          checked={setting.member_updates_enabled}
                          onCheckedChange={(checked) =>
                            updateTreeSettings(
                              setting.tree_id,
                              'member_updates_enabled',
                              checked,
                            )
                          }
                          disabled={isSaving}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
