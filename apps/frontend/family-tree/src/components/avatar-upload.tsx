'use client'

import React, { useState, useCallback } from 'react'
import Cropper, { Area } from 'react-easy-crop'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Camera, Loader2, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AvatarUploadProps {
  currentAvatarUrl?: string | null
  userInitials: string
  onAvatarChange?: (avatarUrl: string | null) => void
  uploadEndpoint?: string // Allow custom upload endpoint
  deleteEndpoint?: string // Allow custom delete endpoint
  size?: 'sm' | 'md' | 'lg' // Avatar size
}

/**
 * Create a cropped image blob from the original image
 */
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')

  if (!ctx) {
    throw new Error('No 2d context')
  }

  // Set canvas size to the cropped area
  canvas.width = pixelCrop.width
  canvas.height = pixelCrop.height

  // Draw the cropped image
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  )

  // Return as blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error('Canvas is empty'))
        }
      },
      'image/jpeg',
      0.85,
    )
  })
}

/**
 * Create an image element from a URL
 */
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener('load', () => resolve(image))
    image.addEventListener('error', (error) => reject(error))
    image.src = url
  })
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-20 w-20',
  lg: 'h-24 w-24',
}

const iconSizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-7 w-7',
  lg: 'h-8 w-8',
}

const cameraIconClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-4 w-4',
}

export function AvatarUpload({
  currentAvatarUrl,
  userInitials,
  onAvatarChange,
  uploadEndpoint,
  deleteEndpoint,
  size = 'lg',
}: AvatarUploadProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 5MB',
          variant: 'destructive',
        })
        return
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file',
          variant: 'destructive',
        })
        return
      }

      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setImageSrc(reader.result as string)
        setIsOpen(true)
      })
      reader.readAsDataURL(file)
    }
  }

  const handleUpload = async () => {
    if (!imageSrc || !croppedAreaPixels) return

    setIsUploading(true)
    try {
      // Create cropped image blob
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels)

      // Create form data
      const formData = new FormData()
      formData.append('file', croppedBlob, 'avatar.jpg')

      // Upload to backend
      const baseUrl = process.env.NEXT_PUBLIC_API_URL
      const endpoint = uploadEndpoint || `${baseUrl}/users/me/avatar`
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to upload avatar')
      }

      const data = await response.json()

      toast({
        title: 'Success',
        description: 'Avatar uploaded successfully',
      })

      // Notify parent component
      if (onAvatarChange && data.avatar_url) {
        onAvatarChange(data.avatar_url)
      }

      // Close dialog and reset
      setIsOpen(false)
      setImageSrc(null)
      setCrop({ x: 0, y: 0 })
      setZoom(1)
    } catch (error) {
      console.error('Error uploading avatar:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to upload avatar',
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleDelete = async () => {
    if (!currentAvatarUrl) return

    setIsDeleting(true)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8050'
      const endpoint = deleteEndpoint || `${baseUrl}/users/me/avatar`
      const response = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to delete avatar')
      }

      toast({
        title: 'Success',
        description: 'Avatar deleted successfully',
      })

      // Notify parent component
      if (onAvatarChange) {
        onAvatarChange(null)
      }
    } catch (error) {
      console.error('Error deleting avatar:', error)
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'Failed to delete avatar',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Handle avatar URL - if it starts with /uploads, use the backend URL (not API URL)
  const avatarUrl = currentAvatarUrl
    ? currentAvatarUrl.startsWith('/uploads')
      ? `${
          process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8050'
        }${currentAvatarUrl}` // Direct backend URL for static files
      : currentAvatarUrl.startsWith('http')
      ? currentAvatarUrl // Already a full URL
      : currentAvatarUrl
    : undefined

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        <Avatar className={sizeClasses[size]}>
          <AvatarImage src={avatarUrl} alt="Avatar" />
          <AvatarFallback
            className={`${
              size === 'sm' ? 'text-sm' : size === 'md' ? 'text-lg' : 'text-2xl'
            } bg-primary/10`}
          >
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <label
          htmlFor="avatar-upload"
          className={`absolute bottom-0 right-0 ${iconSizeClasses[size]} rounded-full bg-primary text-primary-foreground flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors`}
        >
          <Camera className={cameraIconClasses[size]} />
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <label
          htmlFor="avatar-upload"
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2 cursor-pointer"
        >
          Change Avatar
        </label>
        {currentAvatarUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <X className="mr-2 h-4 w-4" />
                Remove Avatar
              </>
            )}
          </Button>
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Crop your avatar</DialogTitle>
            <DialogDescription>
              Adjust the image to fit within the circle
            </DialogDescription>
          </DialogHeader>

          <div className="relative h-[400px] bg-muted rounded-lg overflow-hidden">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            )}
          </div>

          <div className="space-y-2">
            <label htmlFor="zoom" className="text-sm font-medium">
              Zoom
            </label>
            <input
              id="zoom"
              type="range"
              min={1}
              max={3}
              step={0.1}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsOpen(false)
                setImageSrc(null)
              }}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
