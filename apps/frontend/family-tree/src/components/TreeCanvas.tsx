/**
 * TreeCanvas - Main tree visualization with pan/zoom
 * Uses GSAP for smooth animations and transforms
 */

'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { TreeMember, MemberNode } from '@/types/member'
import { TreeMemberCard } from '@/components/TreeMemberCard'
import { TreeEdges } from '@/components/TreeEdges'
import { PhylogeneticBackground } from '@/components/PhylogeneticBackground'
import { TreeBranchAnimation } from '@/components/TreeBranchAnimation'
import TreeNavigationHelp from '@/components/TreeNavigationHelp'
import { gsap } from 'gsap'
import {
  Loader2,
  Maximize2,
  Minimize2,
  HelpCircle,
  Search,
  Navigation,
  Download,
  Share2,
} from 'lucide-react'
import { MemberDrawer } from '@/components/MemberDrawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import { calculateTreeLayout } from '@/utils/tree-layout'
import { useCanvasKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

interface TreeCanvasProps {
  members: TreeMember[]
  selectedMemberId?: string
  onMemberClick?: (member: TreeMember) => void
  onCenterOnMember?: (memberId: string) => void
  highlightPath?: string[]
  treeId?: string
  // Props for fullscreen drawer support
  selectedMember?: TreeMember | null
  drawerOpen?: boolean
  onDrawerOpenChange?: (open: boolean) => void
  onEditClick?: () => void
  onAddSpouseClick?: () => void
  onAddChildClick?: () => void
  onAddParentClick?: () => void
  onMemberNavigate?: (member: TreeMember) => void
  onRelationshipAnalyze?: (fromMemberId: string, toMemberId: string) => void
}

interface CanvasTransform {
  scale: number
  translateX: number
  translateY: number
}

export function TreeCanvas({
  members,
  selectedMemberId,
  onMemberClick,
  treeId,
  onCenterOnMember,
  highlightPath = [],
  selectedMember,
  drawerOpen = false,
  onDrawerOpenChange,
  onEditClick,
  onAddSpouseClick,
  onAddChildClick,
  onAddParentClick,
  onMemberNavigate,
  onRelationshipAnalyze,
}: TreeCanvasProps) {
  // State for traceability highlighting
  const [traceHighlightPath, setTraceHighlightPath] = useState<string[]>([])

  // State for member click tracking (to enable tap-to-deselect)
  const [lastClickedMember, setLastClickedMember] = useState<string | null>(
    null,
  )
  const [lastClickTime, setLastClickTime] = useState<number>(0)
  const [shouldCenterOnSelection, setShouldCenterOnSelection] =
    useState<boolean>(false)

  // Function to trace lineage from a member to all roots
  const traceToRoot = useCallback(
    (memberId: string): string[] => {
      const visited = new Set<string>()
      const path: string[] = []
      const roots: string[] = []

      const trace = (currentId: string) => {
        if (visited.has(currentId)) return
        visited.add(currentId)
        path.push(currentId)

        const member = members.find((m) => m.id === currentId)
        if (!member) return

        // If this member has no parents, they're a root
        if (member.parentIds.length === 0) {
          roots.push(currentId)
          return
        }

        // Trace through all parents to get complete lineage
        member.parentIds.forEach((parentId) => {
          if (!visited.has(parentId)) {
            trace(parentId)
          }
        })
      }

      trace(memberId)

      console.log(
        `[TreeCanvas] 🌳 Lineage trace for ${members.find(
          (m) => m.id === memberId,
        )?.name}:`,
        {
          totalPath: path.length,
          rootsFound: roots.length,
          roots: roots.map((id) => members.find((m) => m.id === id)?.name),
        },
      )

      return path
    },
    [members],
  )

  // Handle connection highlighting for traceability
  const handleConnectionHighlight = useCallback(
    (connectionKey: string) => {
      const [parentId, childId] = connectionKey.split('-')

      // Trace from the child upward to root(s) - this highlights the ancestry path
      // from this specific relationship all the way to the tree's root(s)
      const ancestryPath = traceToRoot(childId)

      const childMember = members.find((m) => m.id === childId)
      const parentMember = members.find((m) => m.id === parentId)

      console.log(
        `[TreeCanvas] 🔆 Tracing ancestry from connection ${parentMember?.name} → ${childMember?.name}:`,
        {
          connection: connectionKey,
          childId,
          parentId,
          pathToRoot: ancestryPath,
          pathLength: ancestryPath.length,
          includesParent: ancestryPath.includes(parentId),
          memberNames: ancestryPath.map(
            (id) => members.find((m) => m.id === id)?.name,
          ),
        },
      )

      setTraceHighlightPath(ancestryPath)

      // Auto-clear after 10 seconds
      setTimeout(() => {
        setTraceHighlightPath([])
      }, 10000)
    },
    [traceToRoot, members],
  )

  // Combine external highlightPath with internal trace highlighting
  const combinedHighlightPath = [...highlightPath, ...traceHighlightPath]
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState<CanvasTransform>({
    scale: 1,
    translateX: 0,
    translateY: 0,
  })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef<{
    x: number
    y: number
    pinchDistance?: number
    initialScale?: number
  }>({ x: 0, y: 0 })
  const [layout, setLayout] = useState<{
    nodes: MemberNode[]
    generations: Map<number, TreeMember[]>
  }>({ nodes: [], generations: new Map() })
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<TreeMember[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const { user } = useAuth()
  const { toast } = useToast()

  // Handle member double-click for lineage tracing
  const handleMemberDoubleClick = useCallback(
    (member: TreeMember) => {
      // Trace this member's complete lineage to all roots
      const memberLineage = traceToRoot(member.id)

      console.log(
        `[TreeCanvas] 🌳 Double-click: Tracing lineage for ${member.name}:`,
        {
          memberLineage,
          pathLength: memberLineage.length,
          rootCount: memberLineage.filter((id) => {
            const m = members.find((mem) => mem.id === id)
            return m && m.parentIds.length === 0
          }).length,
        },
      )

      setTraceHighlightPath(memberLineage)

      // Auto-clear after 15 seconds (longer for member traces)
      setTimeout(() => {
        setTraceHighlightPath([])
      }, 15000)
    },
    [traceToRoot, members],
  )

  // Handle member click with tap-to-deselect support
  const handleMemberClick = useCallback(
    (member: TreeMember, shiftKey: boolean = false) => {
      // Check if Shift key is held - this triggers lineage trace
      if (shiftKey) {
        console.log(
          `[TreeCanvas] ⇧ Shift+Click: Tracing lineage for ${member.name}`,
        )
        handleMemberDoubleClick(member)
        return
      }

      const now = Date.now()
      const timeSinceLastClick = now - lastClickTime

      // Check if this is a double-click (within 500ms)
      if (lastClickedMember === member.id && timeSinceLastClick < 500) {
        // Double-click detected - trace lineage
        handleMemberDoubleClick(member)
        // Reset click tracking
        setLastClickedMember(null)
        setLastClickTime(0)
        return
      }

      // Check if clicking the same member after cooldown (1 second)
      if (selectedMemberId === member.id && timeSinceLastClick > 1000) {
        // Deselect the member
        console.log(`[TreeCanvas] 👆 Deselecting member: ${member.name}`)
        onMemberClick?.(member) // This should trigger deselection in parent
        setLastClickedMember(null)
        setLastClickTime(0)
        return
      }

      // Normal click - select member
      console.log(`[TreeCanvas] 👆 Selecting member: ${member.name}`)
      setLastClickedMember(member.id)
      setLastClickTime(now)
      setShouldCenterOnSelection(true) // Allow centering on this selection

      // Call the parent handler
      if (isFullscreen && onDrawerOpenChange) {
        onMemberClick?.(member)
        onDrawerOpenChange(true)
      } else {
        onMemberClick?.(member)
      }
    },
    [
      lastClickedMember,
      lastClickTime,
      selectedMemberId,
      onMemberClick,
      isFullscreen,
      onDrawerOpenChange,
      handleMemberDoubleClick,
    ],
  )

  // Close dialogs event listener removed - handled by TreeNavigationHelp component

  // Zoom and pan functions for keyboard shortcuts
  const zoomIn = useCallback(() => {
    if (!containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const centerX = containerRect.width / 2
    const centerY = containerRect.height / 2

    const newScale = Math.min(transform.scale + 0.3, 3)

    const canvasPointX = (centerX - transform.translateX) / transform.scale
    const canvasPointY = (centerY - transform.translateY) / transform.scale

    const newTranslateX = centerX - canvasPointX * newScale
    const newTranslateY = centerY - canvasPointY * newScale

    const newTransform = {
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY,
    }

    gsap.to(transform, {
      ...newTransform,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        setTransform({ ...transform })
      },
    })
  }, [transform])

  const zoomOut = useCallback(() => {
    if (!containerRef.current) return

    const containerRect = containerRef.current.getBoundingClientRect()
    const centerX = containerRect.width / 2
    const centerY = containerRect.height / 2

    const newScale = Math.max(transform.scale - 0.3, 0.1)

    const canvasPointX = (centerX - transform.translateX) / transform.scale
    const canvasPointY = (centerY - transform.translateY) / transform.scale

    const newTranslateX = centerX - canvasPointX * newScale
    const newTranslateY = centerY - canvasPointY * newScale

    const newTransform = {
      scale: newScale,
      translateX: newTranslateX,
      translateY: newTranslateY,
    }

    gsap.to(transform, {
      ...newTransform,
      duration: 0.4,
      ease: 'power2.out',
      onUpdate: () => {
        setTransform({ ...transform })
      },
    })
  }, [transform])

  const resetZoom = useCallback(() => {
    if (containerRef.current && layout.nodes.length > 0) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const centerX = containerRect.width / 2
      const centerY = containerRect.height / 2

      const padding = 200
      const minX = Math.min(...layout.nodes.map((n) => n.x)) - padding
      const maxX = Math.max(...layout.nodes.map((n) => n.x)) + padding
      const minY = Math.min(...layout.nodes.map((n) => n.y)) - padding
      const maxY = Math.max(...layout.nodes.map((n) => n.y)) + padding

      const treeCenterX = (minX + maxX) / 2
      const treeCenterY = (minY + maxY) / 2

      const treeWidth = maxX - minX
      const treeHeight = maxY - minY
      const scaleX = containerRect.width / treeWidth
      const scaleY = containerRect.height / treeHeight
      const optimalScale = Math.min(Math.min(scaleX, scaleY), 1) * 0.8

      const newTransform = {
        scale: optimalScale,
        translateX: centerX - treeCenterX * optimalScale,
        translateY: centerY - treeCenterY * optimalScale,
      }

      gsap.to(transform, {
        ...newTransform,
        duration: 1,
        ease: 'power2.inOut',
        onUpdate: () => {
          setTransform({ ...transform })
        },
      })
    } else {
      gsap.to(transform, {
        scale: 1,
        translateX: 0,
        translateY: 0,
        duration: 0.8,
        ease: 'power2.inOut',
        onUpdate: () => {
          setTransform({ ...transform })
        },
      })
    }
  }, [transform, layout.nodes])

  // Search functionality
  const handleSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)

      if (!query.trim()) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }

      const results = members
        .filter(
          (member) =>
            member.name.toLowerCase().includes(query.toLowerCase()) ||
            (member.email &&
              member.email.toLowerCase().includes(query.toLowerCase())),
        )
        .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically by name
        .slice(0, 8) // Limit to 8 results

      setSearchResults(results)
      setShowSearchResults(results.length > 0)
    },
    [members],
  )

  // Navigate to specific member
  const navigateToMember = useCallback(
    (member: TreeMember) => {
      const node = layout.nodes.find((n) => n.member.id === member.id)
      if (!node || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const centerX = containerRect.width / 2
      const centerY = containerRect.height / 2

      // Calculate the transform needed to center this member
      const newTransform = {
        scale: Math.max(transform.scale, 0.8), // Ensure reasonable zoom level
        translateX: centerX - node.x * Math.max(transform.scale, 0.8),
        translateY: centerY - node.y * Math.max(transform.scale, 0.8),
      }

      gsap.to(transform, {
        ...newTransform,
        duration: 1.2,
        ease: 'power2.inOut',
        onUpdate: () => {
          setTransform({ ...transform })
        },
      })

      // Clear search
      setSearchQuery('')
      setShowSearchResults(false)

      // Highlight the member briefly
      setTraceHighlightPath([member.id])
      setTimeout(() => setTraceHighlightPath([]), 3000)

      // Open member drawer and call callbacks
      if (onMemberClick) {
        onMemberClick(member)
      }
      if (onCenterOnMember) {
        onCenterOnMember(member.id)
      }
    },
    [layout.nodes, transform, onMemberClick, onCenterOnMember],
  )

  // Navigate to current user
  const navigateToMe = useCallback(() => {
    if (!user) return

    const myMember = members.find(
      (m) => m.email === user.email || m.id === user.id,
    )

    if (myMember) {
      navigateToMember(myMember)
      toast({
        title: 'Found you! 👋',
        description: `Navigated to ${myMember.name}`,
      })
    } else {
      toast({
        title: 'Not found',
        description: 'You are not a member of this tree yet.',
        variant: 'destructive',
      })
    }
  }, [user, members, navigateToMember, toast])

  // Export functionality
  const exportAsImage = useCallback(
    async (format: 'png' | 'pdf') => {
      if (!canvasRef.current || typeof window === 'undefined') return

      // Store original transform state at function scope
      const originalTransform = { ...transform }

      try {
        // Check if we're in the browser environment
        if (typeof document === 'undefined') {
          throw new Error('Export is only available in browser environment')
        }

        if (layout.nodes.length === 0) {
          toast({
            title: 'Nothing to export',
            description: 'The family tree is empty',
            variant: 'destructive',
          })
          return
        }

        // Show loading toast
        toast({
          title: 'Preparing export...',
          description: 'Generating your family tree image',
        })

        // Reset transform to identity (no zoom/pan)
        setTransform({
          scale: 1,
          translateX: 0,
          translateY: 0,
        })

        // Wait for render to complete
        await new Promise((resolve) => setTimeout(resolve, 300))

        // Calculate actual content bounds with padding
        const padding = 150
        const minX = Math.min(...layout.nodes.map((n) => n.x)) - padding
        const maxX = Math.max(...layout.nodes.map((n) => n.x)) + padding
        const minY = Math.min(...layout.nodes.map((n) => n.y)) - padding
        const maxY = Math.max(...layout.nodes.map((n) => n.y)) + padding

        const width = maxX - minX
        const height = maxY - minY

        // Create a temporary container with absolute positioning
        const tempContainer = document.createElement('div')
        tempContainer.style.position = 'fixed'
        tempContainer.style.left = '0'
        tempContainer.style.top = '0'
        tempContainer.style.width = `${width}px`
        tempContainer.style.height = `${height}px`
        tempContainer.style.overflow = 'hidden'
        tempContainer.style.zIndex = '-9999'
        tempContainer.style.pointerEvents = 'none'

        // Clone the canvas content
        const clonedCanvas = canvasRef.current.cloneNode(true) as HTMLElement
        clonedCanvas.style.transform = `translate(${-minX}px, ${-minY}px)`
        clonedCanvas.style.transformOrigin = '0 0'
        tempContainer.appendChild(clonedCanvas)
        document.body.appendChild(tempContainer)

        // Wait a bit for the cloned content to render
        await new Promise((resolve) => setTimeout(resolve, 100))

        // Dynamic import for client-side only libraries
        const html2canvas = (await import('html2canvas')).default

        // Capture the temporary container
        const canvasImage = await html2canvas(tempContainer, {
          width: width,
          height: height,
          backgroundColor: '#ffffff',
          scale: 2, // High resolution
          useCORS: true,
          allowTaint: true,
          logging: false,
          imageTimeout: 15000,
        })

        // Remove temporary container
        document.body.removeChild(tempContainer)

        // Restore original transform
        setTransform(originalTransform)

        if (format === 'png') {
          // Download PNG
          const link = document.createElement('a')
          const timestamp = new Date().toISOString().split('T')[0]
          link.download = `family-tree-${timestamp}.png`
          link.href = canvasImage.toDataURL('image/png', 1.0) // Maximum quality

          // Temporarily add to DOM for download
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)

          toast({
            title: 'PNG exported! 📸',
            description: 'Your family tree has been downloaded as a PNG image',
          })
        } else {
          // Convert to PDF
          const jsPDF = (await import('jspdf')).default

          // Determine optimal orientation and size
          const orientation = width > height ? 'landscape' : 'portrait'
          const pdf = new jsPDF({
            orientation: orientation,
            unit: 'px',
            format: [width, height],
            compress: true,
          })

          // Add the image to PDF
          pdf.addImage(
            canvasImage.toDataURL('image/png', 1.0),
            'PNG',
            0,
            0,
            width,
            height,
            undefined,
            'FAST', // Compression mode
          )

          // Save the PDF
          const timestamp = new Date().toISOString().split('T')[0]
          pdf.save(`family-tree-${timestamp}.pdf`)

          toast({
            title: 'PDF exported! 📄',
            description:
              'Your family tree has been downloaded as a PDF document',
          })
        }
      } catch (error) {
        console.error('Export failed:', error)

        // Restore original transform on error
        setTransform(originalTransform)

        toast({
          title: 'Export failed',
          description:
            error instanceof Error
              ? error.message
              : 'Could not export the family tree. Please try again.',
          variant: 'destructive',
        })
      }
    },
    [layout.nodes, toast],
  )

  // Share functionality
  const shareTree = useCallback(async () => {
    if (!navigator.share) {
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        toast({
          title: 'Link copied! 📋',
          description: 'Family tree link copied to clipboard',
        })
      } catch (error) {
        toast({
          title: 'Could not copy link',
          description: 'Please copy the URL manually from your browser',
          variant: 'destructive',
        })
      }
      return
    }

    try {
      await navigator.share({
        title: 'Family Tree',
        text: 'Check out our family tree!',
        url: window.location.href,
      })
    } catch (error) {
      // User cancelled or error occurred
      console.log('Share cancelled or failed:', error)
    }
  }, [toast])

  const centerView = useCallback(() => {
    resetZoom()
  }, [resetZoom])

  const toggleFullscreenMode = useCallback(() => {
    setIsFullscreen(!isFullscreen)
  }, [isFullscreen])

  const showHelp = useCallback(() => {
    const event = new CustomEvent('show-tree-help')
    document.dispatchEvent(event)
  }, [])

  // Setup keyboard shortcuts
  useCanvasKeyboardShortcuts({
    zoomIn,
    zoomOut,
    resetZoom,
    centerView,
    toggleFullscreen: toggleFullscreenMode,
    showHelp,
  })

  // Calculate layout when members change and center initially
  useEffect(() => {
    if (members.length > 0) {
      console.log(
        '[TreeCanvas] Calculating layout for members:',
        members.map((m) => ({
          id: m.id,
          name: m.name,
          parentIds: m.parentIds,
          childIds: m.childIds,
          spouseIds: m.spouseIds,
        })),
      )

      const newLayout = calculateTreeLayout(members)

      console.log('[TreeCanvas] Layout calculated:', {
        nodeCount: newLayout.nodes.length,
        generations: Array.from(newLayout.generations.entries()).map(
          ([gen, mems]) => ({
            generation: gen,
            memberCount: mems.length,
            members: mems.map((m) => m.name),
          }),
        ),
        nodes: newLayout.nodes.map((n) => ({
          name: n.member.name,
          x: n.x,
          y: n.y,
          generation: n.generation,
          spouseCount: n.spouses.length,
        })),
      })

      setLayout(newLayout)

      // Auto-center the tree on initial load
      if (containerRef.current && newLayout.nodes.length > 0) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const centerX = containerRect.width / 2
        const centerY = containerRect.height / 2

        // Calculate tree bounds with padding
        const padding = 200 // Add padding to prevent nodes from being cut off
        const minX = Math.min(...newLayout.nodes.map((n) => n.x)) - padding
        const maxX = Math.max(...newLayout.nodes.map((n) => n.x)) + padding
        const minY = Math.min(...newLayout.nodes.map((n) => n.y)) - padding
        const maxY = Math.max(...newLayout.nodes.map((n) => n.y)) + padding

        const treeCenterX = (minX + maxX) / 2
        const treeCenterY = (minY + maxY) / 2

        // Calculate optimal scale to fit the tree in viewport
        const treeWidth = maxX - minX
        const treeHeight = maxY - minY
        const scaleX = containerRect.width / treeWidth
        const scaleY = containerRect.height / treeHeight
        const optimalScale = Math.min(Math.min(scaleX, scaleY), 1) * 0.8 // 80% of optimal to add margin

        // Center the tree in the viewport
        setTransform({
          scale: optimalScale,
          translateX: centerX - treeCenterX * optimalScale,
          translateY: centerY - treeCenterY * optimalScale,
        })
      }
    }
  }, [members])

  // Pan and zoom handlers
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()

      if (!containerRef.current) return

      const delta = e.deltaY * -0.001
      const newScale = Math.min(Math.max(0.1, transform.scale + delta), 3)

      // Get mouse position relative to container
      const containerRect = containerRef.current.getBoundingClientRect()
      const mouseX = e.clientX - containerRect.left
      const mouseY = e.clientY - containerRect.top

      // Calculate the point in the canvas that the mouse is over
      const canvasPointX = (mouseX - transform.translateX) / transform.scale
      const canvasPointY = (mouseY - transform.translateY) / transform.scale

      // Calculate new translation to keep the mouse point fixed
      const newTranslateX = mouseX - canvasPointX * newScale
      const newTranslateY = mouseY - canvasPointY * newScale

      setTransform({
        scale: newScale,
        translateX: newTranslateX,
        translateY: newTranslateY,
      })
    },
    [transform],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 0) {
        // Left click
        setIsDragging(true)
        dragStart.current = {
          x: e.clientX - transform.translateX,
          y: e.clientY - transform.translateY,
        }
      }
    },
    [transform.translateX, transform.translateY],
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        setTransform((prev) => ({
          ...prev,
          translateX: e.clientX - dragStart.current.x,
          translateY: e.clientY - dragStart.current.y,
        }))
      }
    },
    [isDragging],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Touch handlers for mobile support
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 1) {
        // Single touch - pan
        setIsDragging(true)
        const touch = e.touches[0]
        dragStart.current = {
          x: touch.clientX - transform.translateX,
          y: touch.clientY - transform.translateY,
        }
      }
    },
    [transform.translateX, transform.translateY],
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault() // Prevent scrolling

      if (e.touches.length === 1 && isDragging) {
        // Single touch - pan
        const touch = e.touches[0]
        setTransform((prev) => ({
          ...prev,
          translateX: touch.clientX - dragStart.current.x,
          translateY: touch.clientY - dragStart.current.y,
        }))
      } else if (e.touches.length === 2) {
        // Two finger pinch - zoom
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]

        const distance = Math.sqrt(
          Math.pow(touch2.clientX - touch1.clientX, 2) +
            Math.pow(touch2.clientY - touch1.clientY, 2),
        )

        // Store initial distance on first pinch
        if (!dragStart.current.pinchDistance) {
          dragStart.current.pinchDistance = distance
          dragStart.current.initialScale = transform.scale
        } else {
          const scaleChange = distance / dragStart.current.pinchDistance!
          const newScale = Math.min(
            Math.max(0.1, dragStart.current.initialScale! * scaleChange),
            3,
          )

          if (containerRef.current) {
            // Get the center point between the two touches
            const containerRect = containerRef.current.getBoundingClientRect()
            const centerX =
              (touch1.clientX + touch2.clientX) / 2 - containerRect.left
            const centerY =
              (touch1.clientY + touch2.clientY) / 2 - containerRect.top

            // Calculate the point in the canvas that the pinch center is over
            const canvasPointX =
              (centerX - transform.translateX) / transform.scale
            const canvasPointY =
              (centerY - transform.translateY) / transform.scale

            // Calculate new translation to keep the pinch center point fixed
            const newTranslateX = centerX - canvasPointX * newScale
            const newTranslateY = centerY - canvasPointY * newScale

            setTransform({
              scale: newScale,
              translateX: newTranslateX,
              translateY: newTranslateY,
            })
          } else {
            setTransform((prev) => ({
              ...prev,
              scale: newScale,
            }))
          }
        }
      }
    },
    [isDragging, transform.scale],
  )

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    // Reset pinch tracking
    if (dragStart.current.pinchDistance) {
      dragStart.current.pinchDistance = undefined
      dragStart.current.initialScale = undefined
    }
  }, [])

  // Center on member with smooth animation (only when explicitly requested)
  useEffect(() => {
    if (shouldCenterOnSelection && onCenterOnMember && selectedMemberId) {
      // First, try to find a direct node for the member
      let targetNode = layout.nodes.find(
        (n) => n.member.id === selectedMemberId,
      )

      // If not found, check if the member is a spouse in any node
      if (!targetNode) {
        targetNode = layout.nodes.find((n) =>
          n.spouses.some((spouse) => spouse.id === selectedMemberId),
        )
      }

      if (targetNode && containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect()
        const centerX = containerRect.width / 2
        const centerY = containerRect.height / 2

        const newTransform = {
          scale: 1.2, // Slight zoom in when centering
          translateX: centerX - targetNode.x * 1.2,
          translateY: centerY - targetNode.y * 1.2,
        }

        // Create smooth animation to center on member
        const tl = gsap.timeline()

        // First, highlight the target member with a subtle pulse
        // For spouses, we need to find the couple card element
        const targetElement =
          canvasRef.current?.querySelector(
            `[data-member-id="${selectedMemberId}"]`,
          ) ||
          canvasRef.current?.querySelector(
            `[data-member-id="${targetNode.member.id}"]`,
          )

        if (targetElement) {
          tl.to(
            targetElement,
            {
              scale: 1.1,
              duration: 0.2,
              ease: 'power2.out',
              yoyo: true,
              repeat: 1,
            },
            0,
          )
        }

        // Then animate the canvas transform
        tl.to(
          transform,
          {
            ...newTransform,
            duration: 1.2,
            ease: 'power3.inOut',
            onUpdate: () => {
              setTransform({ ...transform })
            },
          },
          0.2,
        )
      }

      // Reset the flag after centering
      setShouldCenterOnSelection(false)
    }
  }, [
    shouldCenterOnSelection,
    selectedMemberId,
    layout.nodes,
    onCenterOnMember,
  ])

  // Apply transform to canvas
  useEffect(() => {
    if (canvasRef.current) {
      gsap.set(canvasRef.current, {
        x: transform.translateX,
        y: transform.translateY,
        scale: transform.scale,
      })
    }
  }, [transform])

  // Animate tree nodes entrance by generation with delay
  useEffect(() => {
    if (!canvasRef.current || layout.nodes.length === 0) return

    const nodeElements = canvasRef.current.querySelectorAll('.tree-member-node')

    // Group nodes by generation
    const nodesByGeneration = new Map<number, Element[]>()
    nodeElements.forEach((node) => {
      const generation = parseInt(node.getAttribute('data-generation') || '0')
      if (!nodesByGeneration.has(generation)) {
        nodesByGeneration.set(generation, [])
      }
      nodesByGeneration.get(generation)!.push(node)
    })

    // Animate each generation with stagger and initial delay
    const tl = gsap.timeline({ delay: 1.5 }) // 1.5 second delay to let users see the tree structure

    Array.from(nodesByGeneration.entries())
      .sort(([a], [b]) => a - b) // Sort by generation
      .forEach(([, nodes], genIndex) => {
        // Set initial state
        tl.set(
          nodes,
          {
            opacity: 0,
            scale: 0.3,
            y: '+=30',
            rotationY: 90,
          },
          0,
        )

        // Animate entrance with longer duration for better visibility
        tl.to(
          nodes,
          {
            opacity: 1,
            scale: 1,
            y: '-=30',
            rotationY: 0,
            duration: 1.2, // Increased from 0.8
            ease: 'back.out(1.4)',
            stagger: {
              amount: 1.0, // Increased from 0.6 for more spread
              from: 'center',
            },
          },
          genIndex * 0.5,
        ) // Increased from 0.3 for more spacing between generations
      })

    return () => {
      tl.kill()
    }
  }, [layout.nodes])

  // Add wheel event listener
  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false })
      return () => container.removeEventListener('wheel', handleWheel)
    }
    return undefined
  }, [handleWheel])

  // Fullscreen functionality
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen()
      setIsFullscreen(true)
    } else {
      // Close drawer first if it's open, then exit fullscreen
      if (drawerOpen && onDrawerOpenChange) {
        onDrawerOpenChange(false)
        return
      }
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }, [drawerOpen, onDrawerOpenChange])

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () =>
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  if (members.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>Loading family tree...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full overflow-hidden bg-slate-50 dark:bg-slate-900"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none', // Prevent default touch behaviors
      }}
    >
      {/* Animated phylogenetic background layers */}
      <div className="absolute inset-0" style={{ zIndex: 1 }}>
        <TreeBranchAnimation opacity={0.06} density={0.8} />
        <PhylogeneticBackground opacity={0.08} scale={1} />
      </div>

      {/* Canvas content */}
      <div
        ref={canvasRef}
        className="absolute"
        style={{ transformOrigin: '0 0', zIndex: 10 }}
      >
        {/* Render edges first (behind nodes) */}
        <TreeEdges
          nodes={layout.nodes}
          highlightPath={combinedHighlightPath}
          onRelationshipAnalyze={onRelationshipAnalyze}
          onConnectionHighlight={handleConnectionHighlight}
        />

        {/* Render member nodes */}
        {layout.nodes.map((node, index) => (
          <div
            key={node.member.id}
            className="absolute tree-member-node"
            style={{
              left: node.x,
              top: node.y,
              transform: 'translate(-50%, -50%)',
            }}
            data-generation={node.generation}
            data-index={index}
            data-member-id={node.member.id}
          >
            <TreeMemberCard
              member={node.member}
              spouses={node.spouses}
              isSelected={selectedMemberId === node.member.id}
              isHighlighted={combinedHighlightPath.includes(node.member.id)}
              onClick={(e) =>
                handleMemberClick(node.member, e?.shiftKey || false)
              }
              onMemberClick={onMemberClick}
              selectedMemberId={selectedMemberId}
            />
          </div>
        ))}
      </div>

      {/* Search Bar - Top Center */}
      <div
        className={`absolute top-4 left-1/2 transform -translate-x-1/2 transition-opacity duration-200 ${
          drawerOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          zIndex: drawerOpen ? 10 : 1000,
          pointerEvents: drawerOpen ? 'none' : 'auto',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-full px-4 py-2 shadow-lg border border-white/20 dark:border-gray-700/20">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search family members..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/70 text-foreground min-w-[250px]"
            />
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={navigateToMe}
                className="rounded-full h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                title="Navigate to me"
              >
                <Navigation className="h-4 w-4 text-blue-600" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-900/20"
                  title="Export & Share"
                >
                  <Share2 className="h-4 w-4 text-green-600" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => exportAsImage('png')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export as PNG
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportAsImage('pdf')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={shareTree}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Tree
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search Results */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md rounded-lg shadow-lg border border-white/20 dark:border-gray-700/20 max-h-64 overflow-y-auto">
              {searchResults.map((member) => (
                <button
                  key={member.id}
                  onClick={() => navigateToMember(member)}
                  className="w-full px-4 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-medium">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {member.name}
                    </div>
                    {member.email && (
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {member.email}
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Controls overlay */}
      <div
        className={`absolute bottom-4 right-4 flex flex-col gap-2 transition-opacity duration-200 ${
          drawerOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          zIndex: drawerOpen ? 10 : 1000,
          pointerEvents: drawerOpen ? 'none' : 'auto',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          className="rounded-md bg-white px-3 py-2 text-sm shadow-md hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all hover:scale-105 hover:shadow-lg"
          onClick={resetZoom}
        >
          Reset View
        </button>
        <button
          className="rounded-md bg-white px-3 py-2 text-sm shadow-md hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all hover:scale-105 hover:shadow-lg"
          onClick={zoomIn}
        >
          Zoom In
        </button>
        <button
          className="rounded-md bg-white px-3 py-2 text-sm shadow-md hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all hover:scale-105 hover:shadow-lg"
          onClick={zoomOut}
        >
          Zoom Out
        </button>
        <button
          className="rounded-md bg-white px-3 py-2 text-sm shadow-md hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center gap-2"
          onClick={toggleFullscreen}
          title={
            isFullscreen
              ? drawerOpen
                ? 'Close Drawer'
                : 'Exit Fullscreen'
              : 'Enter Fullscreen'
          }
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
          {isFullscreen
            ? drawerOpen
              ? 'Close Drawer'
              : 'Exit Canvas'
            : 'Enter Canvas'}
        </button>
      </div>

      {/* Help button - top right */}
      <div
        className={`absolute top-4 right-4 transition-opacity duration-200 ${
          drawerOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        style={{
          zIndex: drawerOpen ? 10 : 1000,
          pointerEvents: drawerOpen ? 'none' : 'auto',
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          className="rounded-md bg-white px-3 py-2 text-sm shadow-md hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
          onClick={() => {
            const event = new CustomEvent('show-tree-help')
            document.dispatchEvent(event)
          }}
          title="Help & Keyboard Shortcuts"
        >
          <HelpCircle className="h-4 w-4" />
        </button>
      </div>

      {/* Tree Navigation Help Dialog - extracted to separate component */}
      <TreeNavigationHelp />

      {/* Fullscreen Member Drawer - only render when in fullscreen mode */}
      {isFullscreen && selectedMember && onDrawerOpenChange && (
        <>
          <style>{`
            /* Standardized z-index system for TreeCanvas */
            
            /* Dialog layers */
            body:fullscreen [data-radix-dialog-overlay] {
              z-index: 50 !important;
            }
            body:fullscreen [data-radix-dialog-content] {
              z-index: 51 !important;
            }
            
            /* Sheet layers */
            body:fullscreen [data-radix-sheet-overlay] {
              z-index: 40 !important;
            }
            body:fullscreen [data-radix-sheet-content] {
              z-index: 41 !important;
            }
          `}</style>
          <MemberDrawer
            member={selectedMember}
            open={drawerOpen}
            onOpenChange={onDrawerOpenChange}
            allMembers={members}
            treeId={treeId}
            isTreeCanvasPage={true}
            onMemberNavigate={onMemberNavigate}
            onEditClick={onEditClick}
            onAddSpouseClick={onAddSpouseClick}
            onAddChildClick={onAddChildClick}
            onAddParentClick={onAddParentClick}
          />
        </>
      )}
    </div>
  )
}
