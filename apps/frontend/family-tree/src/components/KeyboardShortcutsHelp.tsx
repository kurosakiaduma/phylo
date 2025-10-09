'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface ShortcutGroup {
  title: string
  shortcuts: Array<{
    keys: string[]
    description: string
  }>
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['Shift', 'Alt', 'H'], description: 'Go to Home' },
      { keys: ['Shift', 'Alt', 'T'], description: 'Go to Trees' },
      { keys: ['Shift', 'Alt', 'N'], description: 'Go to Notifications' },
      { keys: ['Shift', 'Alt', 'P'], description: 'Go to Profile' },
      { keys: ['Shift', '/'], description: 'Focus Search' },
    ],
  },
  {
    title: 'Tree Pages',
    shortcuts: [
      { keys: ['Shift', 'Alt', 'E'], description: 'Go to Events' },
      { keys: ['Shift', 'Alt', 'G'], description: 'Go to Gallery' },
      { keys: ['Shift', 'Alt', 'R'], description: 'Go to Relationships' },
      { keys: ['Shift', 'Alt', 'M'], description: 'Go to Members' },
      { keys: ['Shift', 'Alt', 'I'], description: 'Go to Invites' },
    ],
  },
  {
    title: 'Canvas Controls',
    shortcuts: [
      { keys: ['Shift', '+'], description: 'Zoom In' },
      { keys: ['Shift', '_'], description: 'Zoom Out' },
      { keys: ['Shift', '0'], description: 'Reset Zoom' },
      { keys: ['Shift', 'Alt', 'C'], description: 'Center View' },
      { keys: ['Shift', 'F'], description: 'Toggle Fullscreen' },
      { keys: ['Shift', 'H'], description: 'Show Tree Navigation Help' },
    ],
  },
  {
    title: 'Tree Interaction',
    shortcuts: [
      { keys: ['Shift', 'Click'], description: 'Trace Member Lineage to Root' },
      { keys: ['Double-Click'], description: 'Trace Connector to Root' },
      { keys: ['Triple-Click'], description: 'Analyze Relationship' },
    ],
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['Esc'], description: 'Close Dialogs' },
      { keys: ['Shift', '?'], description: 'Show This Help' },
    ],
  },
]

export default function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleShowHelp = () => setIsOpen(true)
    document.addEventListener('show-shortcuts-help', handleShowHelp)
    return () =>
      document.removeEventListener('show-shortcuts-help', handleShowHelp)
  }, [])

  useEffect(() => {
    const handleCloseDialogs = () => setIsOpen(false)
    document.addEventListener('close-dialogs', handleCloseDialogs)
    return () =>
      document.removeEventListener('close-dialogs', handleCloseDialogs)
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto z-[9999]">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-lg font-semibold mb-3">{group.title}</h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2"
                  >
                    <span className="text-sm text-muted-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <Badge
                          key={keyIndex}
                          variant="outline"
                          className="text-xs"
                        >
                          {key}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Keyboard shortcuts are disabled when typing in
            input fields or text areas.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
