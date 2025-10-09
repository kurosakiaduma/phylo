'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { HelpCircle } from 'lucide-react'

export default function TreeNavigationHelp() {
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleShowHelp = () => setIsOpen(true)
    document.addEventListener('show-tree-help', handleShowHelp)
    return () => document.removeEventListener('show-tree-help', handleShowHelp)
  }, [])

  useEffect(() => {
    const handleCloseDialogs = () => setIsOpen(false)
    document.addEventListener('close-dialogs', handleCloseDialogs)
    return () =>
      document.removeEventListener('close-dialogs', handleCloseDialogs)
  }, [])

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col z-[9999]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Family Tree Help & Shortcuts
          </DialogTitle>
          <DialogDescription>
            Learn how to navigate and interact with your family tree using
            mouse, touch, and keyboard controls
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
          {/* Mouse Controls */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              🖱️ Mouse Controls
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground pl-2">
              <li>
                • <strong>Click & Drag:</strong> Pan around the tree
              </li>
              <li>
                • <strong>Mouse Wheel:</strong> Zoom in and out
              </li>
              <li>
                • <strong>Click Member:</strong> View member details
              </li>
              <li>
                • <strong>Shift+Click Member:</strong> Trace lineage to root(s)
              </li>
              <li>
                • <strong>Double-Click Connector:</strong> Trace ancestry path
              </li>
              <li>
                • <strong>Triple-Click Connector:</strong> Analyze relationship
              </li>
            </ul>
          </div>

          {/* Touch Controls */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              📱 Touch Controls
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground pl-2">
              <li>
                • <strong>Touch & Drag:</strong> Pan around the tree
              </li>
              <li>
                • <strong>Pinch:</strong> Zoom in and out
              </li>
              <li>
                • <strong>Tap Member:</strong> View member details
              </li>
              <li>
                • <strong>Tap Again (after 1s):</strong> Deselect member
              </li>
            </ul>
          </div>

          {/* Canvas Controls */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              🎛️ Canvas Controls
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground pl-2">
              <li>
                • <strong>Shift + +:</strong> Zoom in
              </li>
              <li>
                • <strong>Shift + _:</strong> Zoom out
              </li>
              <li>
                • <strong>Shift + 0:</strong> Reset zoom and center view
              </li>
              <li>
                • <strong>Shift + Alt + C:</strong> Center view
              </li>
              <li>
                • <strong>Shift + F:</strong> Toggle fullscreen mode
              </li>
              <li>
                • <strong>Shift + H:</strong> Show this help dialog
              </li>
            </ul>
          </div>

          {/* Navigation Shortcuts */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              🧭 Navigation Shortcuts
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground pl-2">
              <li>
                • <strong>Shift + Alt + H:</strong> Go to Home
              </li>
              <li>
                • <strong>Shift + Alt + T:</strong> Go to Trees
              </li>
              <li>
                • <strong>Shift + Alt + E:</strong> Go to Events
              </li>
              <li>
                • <strong>Shift + Alt + G:</strong> Go to Gallery
              </li>
              <li>
                • <strong>Shift + Alt + R:</strong> Go to Relationships
              </li>
              <li>
                • <strong>Shift + Alt + M:</strong> Go to Members
              </li>
              <li>
                • <strong>Shift + Alt + I:</strong> Go to Invites
              </li>
              <li>
                • <strong>Shift + /:</strong> Focus search bar
              </li>
            </ul>
          </div>

          {/* Traceability Features */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              🔍 Traceability Features
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground pl-2">
              <li>
                • <strong>Shift+Click Member Card:</strong> Highlights complete
                ancestry path to root (amber)
              </li>
              <li>
                • <strong>Double-Click Connector:</strong> Traces lineage from
                child to root (10s highlight)
              </li>
              <li>
                • <strong>Triple-Click Connector:</strong> Opens relationship
                analyzer dialog
              </li>
              <li>
                • <strong>Tap-to-Deselect:</strong> Click selected member after
                1s to close drawer
              </li>
            </ul>
          </div>

          {/* Family Connections */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              👥 Family Connections
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground pl-2">
              <li>
                • <strong>Green Lines:</strong> Show parent-child relationships
              </li>
              <li>
                • <strong>Amber Lines:</strong> Highlighted ancestry paths
              </li>
              <li>
                • <strong>Blue Lines:</strong> Selected relationships
              </li>
              <li>
                • <strong>Heart Icons:</strong> Indicate married couples
              </li>
              <li>
                • <strong>Generations:</strong> Arranged top to bottom
              </li>
            </ul>
          </div>

          {/* Visual Elements */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              🎨 Visual Elements
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground pl-2">
              <li>
                • <strong>Background Animation:</strong> Phylogenetic branches
                and DNA helixes
              </li>
              <li>
                • <strong>Member Highlights:</strong> Blue ring (selected),
                Amber ring (traced ancestry)
              </li>
              <li>
                • <strong>Color Coding:</strong> Blue (male), Pink (female),
                Purple (other)
              </li>
              <li>
                • <strong>Deceased Members:</strong> Slightly transparent with
                strikethrough name
              </li>
            </ul>
          </div>

          {/* Tips */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              💡 Tips
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground pl-2">
              <li>• Use fullscreen mode (Shift+F) for large families</li>
              <li>
                • Shift+Click any member to see their complete ancestry path
              </li>
              <li>
                • Double-click connectors to trace lineage from that point
              </li>
              <li>• Follow the curved lines to trace relationships</li>
              <li>• The tree automatically centers on first load</li>
              <li>• Zoom out to see the full family structure</li>
              <li>• Search bar supports member names and emails</li>
              <li>• Press Shift+? to see all keyboard shortcuts in detail</li>
              <li>
                • Keyboard shortcuts disabled while typing in input fields
              </li>
            </ul>
          </div>

          {/* General Shortcuts */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm flex items-center gap-2">
              🔧 General
            </h4>
            <ul className="space-y-2 text-sm text-muted-foreground pl-2">
              <li>
                • <strong>Esc:</strong> Close dialogs and exit fullscreen
              </li>
              <li>
                • <strong>Shift + ?:</strong> Show complete keyboard shortcuts
                reference
              </li>
              <li>
                • <strong>Shift + Alt + N:</strong> Go to Notifications
              </li>
              <li>
                • <strong>Shift + Alt + P:</strong> Go to Profile
              </li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t flex-shrink-0">
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200 transition-colors"
            onClick={() => setIsOpen(false)}
          >
            Got it!
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
