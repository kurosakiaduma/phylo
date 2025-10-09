'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useToast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  Save,
  Loader2,
  AlertTriangle,
  Info,
  Shield,
} from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ApiTreeSettings } from '@/types/api'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Tree {
  id: string
  name: string
  description?: string
  settings: ApiTreeSettings
  user_role: 'custodian' | 'contributor' | 'viewer'
}

interface PreviewImpact {
  would_violate: boolean
  affected_relationships: number
  affected_members: number
  violations: Array<{
    member_id: string
    member_name: string
    issue: string
  }>
}

export default function TreeSettingsPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const treeId = params.id as string

  const [tree, setTree] = useState<Tree | null>(null)
  const [settings, setSettings] = useState<ApiTreeSettings>({
    allow_same_sex: true,
    monogamy: true,
    allow_polygamy: false,
    allow_single_parent: true,
    allow_multi_parent_children: false,
    max_parents_per_child: 2,
  })
  const [originalSettings, setOriginalSettings] =
    useState<ApiTreeSettings | null>(null)
  const [previewImpact, setPreviewImpact] = useState<PreviewImpact | null>(null)
  const [forceUpdate, setForceUpdate] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPreviewing, setIsPreviewing] = useState(false)

  // Fetch tree details
  useEffect(() => {
    const fetchTree = async () => {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/trees/${treeId}`,
          {
            credentials: 'include',
          },
        )

        if (!response.ok) {
          throw new Error('Failed to fetch tree details')
        }

        const data = await response.json()
        setTree(data)

        // Initialize settings with current tree settings
        const currentSettings: ApiTreeSettings = {
          allow_same_sex: data.settings.allowSameSex ?? true,
          monogamy: data.settings.monogamy ?? true,
          allow_polygamy: data.settings.allowPolygamy ?? false,
          allow_single_parent: data.settings.allowSingleParent ?? true,
          allow_multi_parent_children:
            data.settings.allowMultiParentChildren ?? false,
          max_parents_per_child: data.settings.maxParentsPerChild ?? 2,
          max_spouses_per_member: data.settings.maxSpousesPerMember,
        }

        setSettings(currentSettings)
        setOriginalSettings(currentSettings)
      } catch (error) {
        console.error('Error fetching tree:', error)
        toast({
          title: 'Error',
          description: 'Failed to load tree settings',
          variant: 'destructive',
        })
        router.push(`/trees/${treeId}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTree()
  }, [treeId, router, toast])

  // Check if user is custodian
  if (tree && tree.user_role !== 'custodian') {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto space-y-6">
          <Alert variant="destructive">
            <Shield className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              Only custodians can modify tree settings.
            </AlertDescription>
          </Alert>
          <Button onClick={() => router.push(`/trees/${treeId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tree
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  const hasChanges =
    originalSettings &&
    JSON.stringify(settings) !== JSON.stringify(originalSettings)

  const updateSetting = <K extends keyof ApiTreeSettings>(
    key: K,
    value: ApiTreeSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    setPreviewImpact(null) // Clear preview when settings change
  }

  const handlePreview = async () => {
    try {
      setIsPreviewing(true)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trees/${treeId}/settings/preview`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(settings),
        },
      )

      if (!response.ok) {
        throw new Error('Failed to preview settings impact')
      }

      const impact = await response.json()
      setPreviewImpact(impact)

      if (impact.would_violate) {
        toast({
          title: 'Warning',
          description: `These settings would affect ${impact.affected_relationships} relationship(s)`,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'No conflicts',
          description: 'These settings can be applied without issues',
        })
      }
    } catch (error) {
      console.error('Error previewing settings:', error)
      toast({
        title: 'Error',
        description: 'Failed to preview settings impact',
        variant: 'destructive',
      })
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleSave = async () => {
    if (previewImpact?.would_violate && !forceUpdate) {
      setShowConfirmDialog(true)
      return
    }

    try {
      setIsSaving(true)

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/trees/${treeId}${
          forceUpdate ? '?force=true' : ''
        }`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            settings,
          }),
        },
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to update settings')
      }

      toast({
        title: 'Success',
        description: 'Tree settings updated successfully',
      })

      setShowConfirmDialog(false)
      setForceUpdate(false)
      setPreviewImpact(null)
      setOriginalSettings(settings)

      // Refresh tree data
      router.refresh()
    } catch (error: any) {
      console.error('Error updating settings:', error)
      toast({
        title: 'Error',
        description: error.message || 'Failed to update settings',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  if (!tree) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tree Settings</h1>
            <p className="text-muted-foreground mt-1">{tree.name}</p>
          </div>
          <Button
            variant="ghost"
            onClick={() => router.push(`/trees/${treeId}`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>

        {/* Info Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>About Tree Settings</AlertTitle>
          <AlertDescription>
            These settings control what types of relationships and family
            structures are allowed in your tree. Changes may affect existing
            relationships.
          </AlertDescription>
        </Alert>

        {/* Settings Form */}
        <Card>
          <CardHeader>
            <CardTitle>Relationship Settings</CardTitle>
            <CardDescription>
              Configure the rules for your family tree
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Same-sex relationships */}
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1">
                <Label
                  htmlFor="allow_same_sex"
                  className="text-base font-medium"
                >
                  Allow same-sex relationships
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Enable relationships between members of the same gender
                </p>
              </div>
              <Switch
                id="allow_same_sex"
                checked={settings.allow_same_sex}
                onCheckedChange={(checked) =>
                  updateSetting('allow_same_sex', checked)
                }
              />
            </div>

            <Separator />

            {/* Monogamy / Polygamy */}
            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1">
                  <Label htmlFor="monogamy" className="text-base font-medium">
                    Enforce monogamy
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Members can only have one spouse at a time
                  </p>
                </div>
                <Switch
                  id="monogamy"
                  checked={settings.monogamy}
                  onCheckedChange={(checked) => {
                    updateSetting('monogamy', checked)
                    if (checked) {
                      updateSetting('allow_polygamy', false)
                      updateSetting('max_spouses_per_member', undefined)
                    }
                  }}
                />
              </div>

              {!settings.monogamy && (
                <>
                  <div className="flex items-center justify-between space-x-4 pl-6">
                    <div className="flex-1">
                      <Label
                        htmlFor="allow_polygamy"
                        className="text-base font-medium"
                      >
                        Allow polygamy
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Members can have multiple spouses simultaneously
                      </p>
                    </div>
                    <Switch
                      id="allow_polygamy"
                      checked={settings.allow_polygamy}
                      onCheckedChange={(checked) =>
                        updateSetting('allow_polygamy', checked)
                      }
                    />
                  </div>

                  {settings.allow_polygamy && (
                    <div className="pl-6 space-y-2">
                      <Label
                        htmlFor="max_spouses"
                        className="text-sm font-medium"
                      >
                        Maximum spouses per member (optional)
                      </Label>
                      <Input
                        id="max_spouses"
                        type="number"
                        min="2"
                        max="10"
                        placeholder="No limit"
                        value={settings.max_spouses_per_member || ''}
                        onChange={(e) =>
                          updateSetting(
                            'max_spouses_per_member',
                            e.target.value
                              ? parseInt(e.target.value)
                              : undefined,
                          )
                        }
                        className="max-w-[200px]"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <Separator />

            {/* Single parent */}
            <div className="flex items-center justify-between space-x-4">
              <div className="flex-1">
                <Label
                  htmlFor="allow_single_parent"
                  className="text-base font-medium"
                >
                  Allow single parent children
                </Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Children can have only one listed parent
                </p>
              </div>
              <Switch
                id="allow_single_parent"
                checked={settings.allow_single_parent}
                onCheckedChange={(checked) =>
                  updateSetting('allow_single_parent', checked)
                }
              />
            </div>

            <Separator />

            {/* Multi-parent children */}
            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-4">
                <div className="flex-1">
                  <Label
                    htmlFor="allow_multi_parent"
                    className="text-base font-medium"
                  >
                    Allow multi-parent children
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Children can have more than 2 parents
                  </p>
                </div>
                <Switch
                  id="allow_multi_parent"
                  checked={settings.allow_multi_parent_children}
                  onCheckedChange={(checked) =>
                    updateSetting('allow_multi_parent_children', checked)
                  }
                />
              </div>

              {settings.allow_multi_parent_children && (
                <div className="pl-6 space-y-2">
                  <Label htmlFor="max_parents" className="text-sm font-medium">
                    Maximum parents per child
                  </Label>
                  <Input
                    id="max_parents"
                    type="number"
                    min="3"
                    max="10"
                    value={settings.max_parents_per_child}
                    onChange={(e) =>
                      updateSetting(
                        'max_parents_per_child',
                        parseInt(e.target.value) || 2,
                      )
                    }
                    className="max-w-[200px]"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Preview Impact */}
        {previewImpact && previewImpact.would_violate && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Settings Conflict Detected</AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                These settings would affect{' '}
                {previewImpact.affected_relationships} relationship(s) involving{' '}
                {previewImpact.affected_members} member(s):
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {previewImpact.violations.map((violation, idx) => (
                  <li key={idx}>
                    <strong>{violation.member_name}</strong>: {violation.issue}
                  </li>
                ))}
              </ul>
              <div className="mt-4 flex items-center space-x-2">
                <Checkbox
                  id="force_update"
                  checked={forceUpdate}
                  onCheckedChange={(checked) =>
                    setForceUpdate(checked as boolean)
                  }
                />
                <label
                  htmlFor="force_update"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Force update and remove conflicting relationships
                </label>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            onClick={handlePreview}
            disabled={!hasChanges || isPreviewing}
            variant="outline"
            className="flex-1"
          >
            {isPreviewing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <Info className="mr-2 h-4 w-4" />
                Preview Impact
              </>
            )}
          </Button>

          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>

        {/* Confirm Dialog */}
        <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Settings Update</DialogTitle>
              <DialogDescription>
                {forceUpdate ? (
                  <div className="space-y-2">
                    <p className="font-semibold text-destructive">
                      Warning: Force update will remove conflicting
                      relationships!
                    </p>
                    <p>
                      This action will permanently delete{' '}
                      {previewImpact?.affected_relationships} relationship(s)
                      that violate the new settings. This cannot be undone.
                    </p>
                  </div>
                ) : (
                  <p>
                    Are you sure you want to update the tree settings? This may
                    affect existing relationships.
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowConfirmDialog(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving}
                variant={forceUpdate ? 'destructive' : 'default'}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Confirm Update'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
