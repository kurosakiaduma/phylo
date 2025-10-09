import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'

interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  altKey?: boolean
  shiftKey?: boolean
  action: () => void
  description: string
}

interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
}

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
}: UseKeyboardShortcutsProps) => {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Don't trigger shortcuts when user is typing in input fields
      const target = event.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const matchingShortcut = shortcuts.find((shortcut) => {
        return (
          shortcut.key.toLowerCase() === event.key.toLowerCase() &&
          !!shortcut.ctrlKey === event.ctrlKey &&
          !!shortcut.altKey === event.altKey &&
          !!shortcut.shiftKey === event.shiftKey
        )
      })

      if (matchingShortcut) {
        event.preventDefault()
        matchingShortcut.action()
      }
    },
    [shortcuts, enabled],
  )

  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown, enabled])
}

// Global keyboard shortcuts for the application
export const useGlobalKeyboardShortcuts = () => {
  const router = useRouter()

  const globalShortcuts: KeyboardShortcut[] = [
    {
      key: 'h',
      shiftKey: true,
      altKey: true,
      action: () => router.push('/'),
      description: 'Go to Home',
    },
    {
      key: 't',
      shiftKey: true,
      altKey: true,
      action: () => router.push('/trees'),
      description: 'Go to Trees',
    },
    {
      key: 'n',
      shiftKey: true,
      altKey: true,
      action: () => router.push('/notifications'),
      description: 'Go to Notifications',
    },
    {
      key: 'p',
      shiftKey: true,
      altKey: true,
      action: () => router.push('/profile'),
      description: 'Go to Profile',
    },
    {
      key: '/',
      shiftKey: true,
      action: () => {
        // Focus search if available
        const searchInput = document.querySelector(
          'input[type="search"]',
        ) as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      },
      description: 'Focus Search',
    },
    {
      key: '?',
      shiftKey: true,
      action: () => {
        // Show keyboard shortcuts help
        const event = new CustomEvent('show-shortcuts-help')
        document.dispatchEvent(event)
      },
      description: 'Show Keyboard Shortcuts Help',
    },
  ]

  useKeyboardShortcuts({ shortcuts: globalShortcuts })
}

// Tree-specific keyboard shortcuts
export const useTreeKeyboardShortcuts = (treeId?: string) => {
  const router = useRouter()

  const treeShortcuts: KeyboardShortcut[] = [
    {
      key: 'e',
      shiftKey: true,
      altKey: true,
      action: () => {
        if (treeId) router.push(`/trees/${treeId}/events`)
      },
      description: 'Go to Events',
    },
    {
      key: 'g',
      shiftKey: true,
      altKey: true,
      action: () => {
        if (treeId) router.push(`/trees/${treeId}/gallery`)
      },
      description: 'Go to Gallery',
    },
    {
      key: 'r',
      shiftKey: true,
      altKey: true,
      action: () => {
        if (treeId) router.push(`/trees/${treeId}/relationships`)
      },
      description: 'Go to Relationships',
    },
    {
      key: 'm',
      shiftKey: true,
      altKey: true,
      action: () => {
        if (treeId) router.push(`/trees/${treeId}/members`)
      },
      description: 'Go to Members',
    },
    {
      key: 'i',
      shiftKey: true,
      altKey: true,
      action: () => {
        if (treeId) router.push(`/trees/${treeId}/invites`)
      },
      description: 'Go to Invites',
    },
    {
      key: 'Escape',
      action: () => {
        // Close any open dialogs or modals
        const event = new CustomEvent('close-dialogs')
        document.dispatchEvent(event)
      },
      description: 'Close Dialogs',
    },
  ]

  useKeyboardShortcuts({ shortcuts: treeShortcuts, enabled: !!treeId })
}

// Canvas-specific keyboard shortcuts
export const useCanvasKeyboardShortcuts = (canvasActions: {
  zoomIn: () => void
  zoomOut: () => void
  resetZoom: () => void
  centerView: () => void
  toggleFullscreen?: () => void
  traceLineage?: () => void
  showHelp?: () => void
}) => {
  const canvasShortcuts: KeyboardShortcut[] = [
    {
      key: '+',
      shiftKey: true,
      action: canvasActions.zoomIn,
      description: 'Zoom In',
    },
    {
      key: '_',
      shiftKey: true,
      action: canvasActions.zoomOut,
      description: 'Zoom Out',
    },
    {
      key: '0',
      shiftKey: true,
      action: canvasActions.resetZoom,
      description: 'Reset Zoom',
    },
    {
      key: 'c',
      shiftKey: true,
      altKey: true,
      action: canvasActions.centerView,
      description: 'Center View',
    },
    {
      key: 'f',
      shiftKey: true,
      action: () => {
        if (canvasActions.toggleFullscreen) {
          canvasActions.toggleFullscreen()
        }
      },
      description: 'Toggle Fullscreen',
    },
    {
      key: 'l',
      shiftKey: true,
      altKey: true,
      action: () => {
        if (canvasActions.traceLineage) {
          canvasActions.traceLineage()
        }
      },
      description: 'Trace Selected Member Lineage',
    },
    {
      key: 'h',
      shiftKey: true,
      action: () => {
        if (canvasActions.showHelp) {
          canvasActions.showHelp()
        }
      },
      description: 'Show Tree Navigation Help',
    },
  ]

  useKeyboardShortcuts({ shortcuts: canvasShortcuts })
}
