'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { DashboardLayout } from '@/components/dashboard-layout'
import { useToast } from '@/hooks/use-toast'
import { ArrowLeft, ArrowRight, Check, Loader2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { ApiTreeSettings } from '@/types/api'

export default function NewTreePage() {
  const router = useRouter()
  const { toast } = useToast()
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form data
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [settings, setSettings] = useState<ApiTreeSettings>({
    allow_same_sex: true,
    monogamy: true,
    allow_polygamy: false,
    allow_single_parent: true,
    allow_multi_parent_children: false,
    max_parents_per_child: 2,
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Tree name is required'
    } else if (name.length < 3) {
      newErrors.name = 'Tree name must be at least 3 characters'
    } else if (name.length > 100) {
      newErrors.name = 'Tree name must be less than 100 characters'
    }

    if (description && description.length > 500) {
      newErrors.description = 'Description must be less than 500 characters'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    } else {
      router.push('/trees')
    }
  }

  const handleSubmit = async () => {
    if (!validateStep1()) {
      setStep(1)
      return
    }

    try {
      setIsSubmitting(true)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trees`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          settings,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to create tree')
      }

      const newTree = await response.json()

      toast({
        title: 'Success!',
        description: 'Your family tree has been created.',
      })

      router.push(`/trees/${newTree.id}`)
    } catch (error: any) {
      console.error('Error creating tree:', error)
      toast({
        title: 'Error',
        description:
          error.message || 'Failed to create tree. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateSetting = <K extends keyof ApiTreeSettings>(
    key: K,
    value: ApiTreeSettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Create New Family Tree
          </h1>
          <p className="text-muted-foreground mt-1">
            Set up your tree with inclusive options for your family structure
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center gap-2">
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            {step > 1 ? <Check className="h-4 w-4" /> : '1'}
          </div>
          <div
            className={`h-1 w-12 ${step >= 2 ? 'bg-primary' : 'bg-muted'}`}
          />
          <div
            className={`flex items-center justify-center w-8 h-8 rounded-full ${
              step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted'
            }`}
          >
            2
          </div>
        </div>

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>
                Give your family tree a name and optional description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Tree Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Smith Family Tree"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value)
                    if (errors.name)
                      setErrors((prev) => ({ ...prev, name: '' }))
                  }}
                  className={errors.name ? 'border-destructive' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Tell us about your family tree..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value)
                    if (errors.description)
                      setErrors((prev) => ({ ...prev, description: '' }))
                  }}
                  rows={4}
                  className={errors.description ? 'border-destructive' : ''}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">
                    {errors.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {description.length}/500 characters
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Inclusive Settings */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Inclusive Settings</CardTitle>
              <CardDescription>
                Configure your tree to reflect your family's unique structure
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Relationship Types */}
              <div>
                <h3 className="text-sm font-medium mb-4">Relationship Types</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="same-sex">
                        Allow Same-Sex Relationships
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Enable relationships between partners of the same gender
                      </p>
                    </div>
                    <Switch
                      id="same-sex"
                      checked={settings.allow_same_sex}
                      onCheckedChange={(checked) =>
                        updateSetting('allow_same_sex', checked)
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Marriage Settings */}
              <div>
                <h3 className="text-sm font-medium mb-4">
                  Marriage & Partnership
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="polygamy">Allow Polygamy</Label>
                      <p className="text-sm text-muted-foreground">
                        Allow members to have multiple simultaneous spouses
                      </p>
                    </div>
                    <Switch
                      id="polygamy"
                      checked={settings.allow_polygamy}
                      onCheckedChange={(checked) => {
                        updateSetting('allow_polygamy', checked)
                        if (checked) {
                          updateSetting('monogamy', false)
                        }
                      }}
                    />
                  </div>

                  {!settings.allow_polygamy && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="monogamy">Enforce Monogamy</Label>
                        <p className="text-sm text-muted-foreground">
                          Members can only have one spouse at a time
                        </p>
                      </div>
                      <Switch
                        id="monogamy"
                        checked={settings.monogamy}
                        onCheckedChange={(checked) =>
                          updateSetting('monogamy', checked)
                        }
                      />
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Parenting Settings */}
              <div>
                <h3 className="text-sm font-medium mb-4">
                  Parenting & Children
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="single-parent">
                        Allow Single Parents
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Children can have one parent listed
                      </p>
                    </div>
                    <Switch
                      id="single-parent"
                      checked={settings.allow_single_parent}
                      onCheckedChange={(checked) =>
                        updateSetting('allow_single_parent', checked)
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="multi-parent">
                        Allow Multi-Parent Children
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Children can have more than two parents
                      </p>
                    </div>
                    <Switch
                      id="multi-parent"
                      checked={settings.allow_multi_parent_children}
                      onCheckedChange={(checked) => {
                        updateSetting('allow_multi_parent_children', checked)
                        if (!checked) {
                          updateSetting('max_parents_per_child', 2)
                        }
                      }}
                    />
                  </div>

                  {settings.allow_multi_parent_children && (
                    <div className="space-y-2">
                      <Label htmlFor="max-parents">
                        Maximum Parents Per Child
                      </Label>
                      <Input
                        id="max-parents"
                        type="number"
                        min="2"
                        max="10"
                        value={settings.max_parents_per_child || 2}
                        onChange={(e) =>
                          updateSetting(
                            'max_parents_per_child',
                            parseInt(e.target.value) || 2,
                          )
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Set how many parents a child can have (useful for
                        adoption, surrogacy, etc.)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step === 1 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Create Tree
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
