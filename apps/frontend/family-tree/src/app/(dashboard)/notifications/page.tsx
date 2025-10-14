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
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/dashboard-layout'

import { useToast } from '@/hooks/use-toast'
import {
  Loader2,
  Bell,
  Calendar,
  Image,
  Users,
  Info,
} from 'lucide-react'

interface Tree {
  id: string
  name: string
  role: string
}

interface NotificationSettings {
  tree_id: string
  tree_name: string
  events_enabled: boolean
  birthdays_enabled: boolean
  death_anniversaries_enabled: boolean
  gallery_updates_enabled: boolean
  member_updates_enabled: boolean
}

export default function NotificationsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userTrees, setUserTrees] = useState<Tree[]>([])
  const [settings, setSettings] = useState<NotificationSettings[]>([])

  useEffect(() => {
    fetchUserTreesAndSettings()
  }, [])

  const fetchUserTreesAndSettings = async () => {
    try {
      setLoading(true)

      // Fetch user's trees
      const treesResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trees`,
        { credentials: 'include' },
      )

      if (treesResponse.ok) {
        const trees = await treesResponse.json()
        setUserTrees(trees)

        // Initialize notification settings for each tree
        const initialSettings: NotificationSettings[] = trees.map(
          (tree: Tree) => ({
            tree_id: tree.id,
            tree_name: tree.name,
            events_enabled: true,
            birthdays_enabled: true,
            death_anniversaries_enabled: true,
            gallery_updates_enabled: true,
            member_updates_enabled: false, // Default to false for member updates
          }),
        )

        setSettings(initialSettings)
      }
    } catch (error) {
      console.error('Error fetching trees:', error)
      toast({
        title: 'Error',
        description: 'Failed to load notification settings.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const updateTreeSetting = (
    treeId: string,
    settingKey: keyof NotificationSettings,
    value: boolean,
  ) => {
    setSettings((prev) =>
      prev.map((setting) =>
        setting.tree_id === treeId
          ? { ...setting, [settingKey]: value }
          : setting,
      ),
    )
  }

  const saveSettings = async () => {
    try {
      setSaving(true)

      // In a real implementation, this would save to the backend
      // For now, we'll just simulate the save
      await new Promise((resolve) => setTimeout(resolve, 1000))

      toast({
        title: 'Settings Saved',
        description: 'Your notification preferences have been updated.',
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to save notification settings.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">
              Loading notification settings...
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Notification Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your notification preferences for each family tree
          </p>
        </div>

        <Separator />

        {userTrees.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Bell className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Family Trees</h3>
                <p className="text-muted-foreground">
                  You haven&apos;t joined any family trees yet. Join or create a tree
                  to manage notifications.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Global Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Global Notification Settings
                </CardTitle>
                <CardDescription>
                  These settings apply to all your family trees
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Receive notifications via email
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-base">Weekly Digest</Label>
                    <p className="text-sm text-muted-foreground">
                      Get a weekly summary of family tree activity
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Per-Tree Settings */}
            {settings.map((treeSetting) => (
              <Card key={treeSetting.tree_id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{treeSetting.tree_name}</span>
                    <Badge variant="outline">
                      {userTrees.find((t) => t.id === treeSetting.tree_id)
                        ?.role || 'Member'}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    Notification preferences for this family tree
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Events Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <Label className="text-base font-medium">
                        Family Events
                      </Label>
                    </div>

                    <div className="ml-6 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Birthday Reminders</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified about upcoming family birthdays
                          </p>
                        </div>
                        <Switch
                          checked={treeSetting.birthdays_enabled}
                          onCheckedChange={(checked) =>
                            updateTreeSetting(
                              treeSetting.tree_id,
                              'birthdays_enabled',
                              checked,
                            )
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Death Anniversaries</Label>
                          <p className="text-sm text-muted-foreground">
                            Remembrance notifications for family members
                          </p>
                        </div>
                        <Switch
                          checked={treeSetting.death_anniversaries_enabled}
                          onCheckedChange={(checked) =>
                            updateTreeSetting(
                              treeSetting.tree_id,
                              'death_anniversaries_enabled',
                              checked,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Gallery Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      <Label className="text-base font-medium">
                        Gallery Updates
                      </Label>
                    </div>

                    <div className="ml-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>New Photos</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when new photos are added to the
                            gallery
                          </p>
                        </div>
                        <Switch
                          checked={treeSetting.gallery_updates_enabled}
                          onCheckedChange={(checked) =>
                            updateTreeSetting(
                              treeSetting.tree_id,
                              'gallery_updates_enabled',
                              checked,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Member Updates Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <Label className="text-base font-medium">
                        Member Updates
                      </Label>
                    </div>

                    <div className="ml-6">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Profile Changes</Label>
                          <p className="text-sm text-muted-foreground">
                            Get notified when family members update their
                            profiles
                          </p>
                        </div>
                        <Switch
                          checked={treeSetting.member_updates_enabled}
                          onCheckedChange={(checked) =>
                            updateTreeSetting(
                              treeSetting.tree_id,
                              'member_updates_enabled',
                              checked,
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={saveSettings} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Notification Settings'
                )}
              </Button>
            </div>

            {/* Information Card */}
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
              <CardContent className="pt-6">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      About Notifications
                    </p>
                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                      <p>
                        • Notifications are sent to your registered email
                        address
                      </p>
                      <p>
                        • You can adjust timing preferences for each
                        notification type
                      </p>
                      <p>
                        • Birthday reminders are sent 3 days before the date
                      </p>
                      <p>
                        • Death anniversary notifications are sent on the date
                      </p>
                      <p>
                        • Gallery notifications are sent immediately when photos
                        are added
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
