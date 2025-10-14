/**
 * TreeEdges - Renders relationship lines between members
 * Using smooth Bezier curves for all connectors, consistent with Comfortaa font design
 */

'use client'

import { useState, useCallback } from 'react'
import { MemberNode } from '@/types/member'

interface TreeEdgesProps {
  nodes: MemberNode[]
  highlightPath?: string[]
  onRelationshipAnalyze?: (fromMemberId: string, toMemberId: string) => void
  onConnectionHighlight?: (connectionKey: string) => void
}

/**
 * Creates individual smooth Bezier curves from each parent to each child
 * Pure Bezier approach - no T-junctions or straight lines
 * Creates organic, flowing connections that match the Comfortaa font aesthetic
 */
function BezierConnector({
  parentNode,
  childNode,
  isHighlighted,
  isSelected,
  onRelationshipAnalyze,
  onConnectionHighlight,
}: {
  parentNode: MemberNode
  childNode: MemberNode
  isHighlighted?: boolean
  isSelected?: boolean
  onRelationshipAnalyze?: (fromMemberId: string, toMemberId: string) => void
  onConnectionHighlight?: (connectionKey: string) => void
}) {
  const [clickCount, setClickCount] = useState(0)
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null)

  // Enhanced color logic: selected (blue) > highlighted (bright yellow) > default (green)
  let color = '#00c71b' // default green
  let strokeWidth = 2.5
  let glowEffect = false

  if (isSelected) {
    color = '#3b82f6' // blue for selected
    strokeWidth = 3.5
    glowEffect = true
  } else if (isHighlighted) {
    color = '#f59e0b' // bright amber for highlighted lineage tracing
    strokeWidth = 4
    glowEffect = true
  }

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()

      if (clickTimeout) {
        clearTimeout(clickTimeout)
      }

      const newClickCount = clickCount + 1
      setClickCount(newClickCount)
      const connectionKey = `${parentNode.member.id}-${childNode.member.id}`

      if (newClickCount === 2) {
        // Double click - highlight the line for lineage tracing
        console.log(
          `[TreeEdges] 🔆 Double-clicked connector: ${parentNode.member.name} -> ${childNode.member.name}`,
        )
        onConnectionHighlight?.(connectionKey)
        // Wait longer for potential third click
        setClickTimeout(setTimeout(() => setClickCount(0), 1000))
      } else if (newClickCount === 3) {
        // Triple click - open relationship analyzer
        console.log(
          `[TreeEdges] 🔍 Triple-clicked connector: ${parentNode.member.name} -> ${childNode.member.name}`,
        )
        onRelationshipAnalyze?.(parentNode.member.id, childNode.member.id)
        setClickCount(0)
        if (clickTimeout) {
          clearTimeout(clickTimeout)
          setClickTimeout(null)
        }
      } else if (newClickCount === 1) {
        // Single click - reset after delay (no action to prevent accidental triggers during scrolling)
        setClickTimeout(setTimeout(() => setClickCount(0), 400))
      } else {
        // More than 3 clicks - reset
        setClickCount(0)
        if (clickTimeout) {
          clearTimeout(clickTimeout)
          setClickTimeout(null)
        }
      }
    },
    [
      clickCount,
      clickTimeout,
      parentNode.member.id,
      childNode.member.id,
      parentNode.member.name,
      childNode.member.name,
      onRelationshipAnalyze,
      onConnectionHighlight,
    ],
  )

  // Conservative connection points that account for variable card heights and widths
  // Cards can vary from 88px (short names) to 120px+ (long names with dates)
  // Spouse cards can be much wider (200px+) so we need generous buffers
  // Use generous buffer to ensure we don't penetrate into card content

  const cardBuffer = 60 // Increased buffer to account for spouse cards

  // Connection points - positioned to avoid card content entirely
  const startX = parentNode.x
  const startY = parentNode.y + cardBuffer - 8 // Just inside bottom edge of parent
  const endX = childNode.x
  const endY = childNode.y - cardBuffer + 8 // Just at top edge of child

  // Safety check: ensure parent is above child
  if (startY >= endY) {
    console.error('[BezierConnector] Invalid parent-child positioning:', {
      parent: {
        name: parentNode.member.name,
        y: parentNode.y,
        bottomY: startY,
      },
      child: { name: childNode.member.name, y: childNode.y, topY: endY },
    })
    return null
  }

  // Calculate smooth Bezier curve control points
  const verticalDistance = endY - startY
  const horizontalDistance = Math.abs(endX - startX)

  // Adaptive control point calculation for natural curves
  const baseControlOffset = Math.max(verticalDistance * 0.4, 50)
  const horizontalInfluence = Math.min(horizontalDistance * 0.2, 80)

  const control1X =
    startX +
    (horizontalDistance > 100
      ? endX > startX
        ? horizontalInfluence
        : -horizontalInfluence
      : 0)
  const control1Y = startY + baseControlOffset
  const control2X =
    endX -
    (horizontalDistance > 100
      ? endX > startX
        ? horizontalInfluence
        : -horizontalInfluence
      : 0)
  const control2Y = endY - baseControlOffset

  // Create smooth S-curve path
  const pathData = `M ${startX} ${startY} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${endX} ${endY}`

  // Calculate SVG bounds with padding
  const minX = Math.min(startX, endX, control1X, control2X) - 20
  const maxX = Math.max(startX, endX, control1X, control2X) + 20
  const minY = Math.min(startY, endY, control1Y, control2Y) - 20
  const maxY = Math.max(startY, endY, control1Y, control2Y) + 20

  return (
    <svg
      className="absolute cursor-pointer"
      style={{
        left: `${minX}px`,
        top: `${minY}px`,
        width: `${maxX - minX}px`,
        height: `${maxY - minY}px`,
        zIndex: 1,
      }}
      onClick={handleClick}
    >
      {/* Invisible wider path for easier clicking */}
      <path
        d={pathData}
        stroke="transparent"
        strokeWidth={strokeWidth + 8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`translate(${-minX}, ${-minY})`}
        style={{ pointerEvents: 'all' }}
      />
      {/* Glow effect for highlighted/selected connections */}
      {glowEffect && (
        <path
          d={pathData}
          stroke={color}
          strokeWidth={strokeWidth + 2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={`translate(${-minX}, ${-minY})`}
          style={{
            pointerEvents: 'none',
            opacity: 0.3,
            filter: 'blur(2px)',
          }}
        />
      )}
      {/* Visible path */}
      <path
        d={pathData}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={`translate(${-minX}, ${-minY})`}
        style={{
          pointerEvents: 'none',
          transition: 'stroke 0.2s ease, stroke-width 0.2s ease',
          filter: glowEffect
            ? 'drop-shadow(0 0 4px rgba(245, 158, 11, 0.5))'
            : 'none',
        }}
      />
    </svg>
  )
}

/**
 * Creates a collection of Bezier curves for a parent-child group
 * Each parent connects to each child with individual smooth curves
 */
function FamilyConnectorGroup({
  parentNodes,
  childNodes,
  isHighlighted,
  selectedConnections,
  highlightedConnection,
  onRelationshipAnalyze,
  onConnectionHighlight,
}: {
  parentNodes: MemberNode[]
  childNodes: MemberNode[]
  isHighlighted?: boolean
  selectedConnections?: Set<string>
  highlightedConnection?: string | null
  onRelationshipAnalyze?: (fromMemberId: string, toMemberId: string) => void
  onConnectionHighlight?: (connectionKey: string) => void
}) {
  if (parentNodes.length === 0 || childNodes.length === 0) return null

  const connectors: JSX.Element[] = []

  // Create individual Bezier curves from each parent to each child
  parentNodes.forEach((parent) => {
    childNodes.forEach((child) => {
      const connectionKey = `${parent.member.id}-${child.member.id}`
      const isSelected = selectedConnections?.has(connectionKey) || false
      const isConnectionHighlighted = highlightedConnection === connectionKey

      connectors.push(
        <BezierConnector
          key={connectionKey}
          parentNode={parent}
          childNode={child}
          isHighlighted={isHighlighted || isConnectionHighlighted}
          isSelected={isSelected}
          onRelationshipAnalyze={onRelationshipAnalyze}
          onConnectionHighlight={onConnectionHighlight}
        />,
      )
    })
  })

  return <>{connectors}</>
}

/**
 * Render all edges (parent-child relationships)
 * Groups children by parent sets and renders smooth connectors
 */
export function TreeEdges({
  nodes,
  highlightPath = [],
  onRelationshipAnalyze,
  onConnectionHighlight: externalConnectionHighlight,
}: TreeEdgesProps) {
  const [selectedConnections] = useState<Set<string>>(
    new Set(),
  )
  const [highlightedConnection, setHighlightedConnection] = useState<
    string | null
  >(null)
  const edges: JSX.Element[] = []

  const handleRelationshipAnalyze = useCallback(
    (fromMemberId: string, toMemberId: string) => {
      onRelationshipAnalyze?.(fromMemberId, toMemberId)
    },
    [onRelationshipAnalyze],
  )

  const handleConnectionHighlight = useCallback(
    (connectionKey: string) => {
      setHighlightedConnection((prev) =>
        prev === connectionKey ? null : connectionKey,
      )
      console.log(`[TreeEdges] 🔆 Highlighted connection: ${connectionKey}`)

      // Also call external handler for traceability
      externalConnectionHighlight?.(connectionKey)
    },
    [externalConnectionHighlight],
  )

  // Group children by their parent sets (to handle multiple children from same parents)
  const parentSetToChildren = new Map<string, string[]>()

  nodes.forEach((node) => {
    const member = node.member
    if (member.parentIds.length > 0) {
      // Create a sorted key from parent IDs
      const parentKey = [...member.parentIds].sort().join('|')
      if (!parentSetToChildren.has(parentKey)) {
        parentSetToChildren.set(parentKey, [])
      }
      parentSetToChildren.get(parentKey)!.push(member.id)
    }

    // IMPORTANT: Also check spouses for parent relationships
    // This fixes the issue where right-sided spouses don't get parent connections
    node.spouses.forEach((spouse) => {
      if (spouse.parentIds.length > 0) {
        // Create a sorted key from spouse's parent IDs
        const spouseParentKey = [...spouse.parentIds].sort().join('|')
        if (!parentSetToChildren.has(spouseParentKey)) {
          parentSetToChildren.set(spouseParentKey, [])
        }
        // Add the spouse as a child, but we'll need to handle positioning differently
        parentSetToChildren.get(spouseParentKey)!.push(spouse.id)
      }
    })
  })

  // DEBUG: Log relationship data with generation info
  console.log('[TreeEdges] Parent-child groupings with generations:', {
    nodeCount: nodes.length,
    parentGroups: Array.from(parentSetToChildren.entries()).map(
      ([parentKey, childIds]) => {
        const parentIds = parentKey.split('|')
        const parents = parentIds.map((pid) =>
          nodes.find((n) => n.member.id === pid),
        )
        const children = childIds.map((cid) =>
          nodes.find((n) => n.member.id === cid),
        )
        return {
          parentKey,
          parents: parents.map((p) => ({
            name: p?.member.name || 'unknown',
            gen: p?.generation,
            y: p?.y,
          })),
          children: children.map((c) => ({
            name: c?.member.name || 'unknown',
            gen: c?.generation,
            y: c?.y,
          })),
          childCount: childIds.length,
        }
      },
    ),
  })

  // Draw edges for each parent-child group using unified connector
  parentSetToChildren.forEach((childIds, parentKey) => {
    const parentIds = parentKey.split('|')

    // Get parent nodes
    const parentNodes = parentIds
      .map((parentId) => nodes.find((n) => n.member.id === parentId))
      .filter((node): node is MemberNode => node !== undefined)

    // Get child nodes - including spouses
    const childNodes = childIds
      .map((childId) => {
        // First try to find in main nodes
        const directNode = nodes.find((n) => n.member.id === childId)
        if (directNode) return directNode

        // If not found, check if it's a spouse in any node
        const spouseNode = nodes.find((n) =>
          n.spouses.some((spouse) => spouse.id === childId),
        )
        if (spouseNode) {
          // Create a virtual node for the spouse using the couple's position
          const spouse = spouseNode.spouses.find((s) => s.id === childId)!
          return {
            member: spouse,
            x: spouseNode.x, // Use the same position as the couple
            y: spouseNode.y,
            generation: spouseNode.generation,
            spouses: [], // Spouses don't have their own spouses array
            familyUnitId: spouseNode.familyUnitId,
          } as MemberNode
        }
        return undefined
      })
      .filter((node): node is MemberNode => node !== undefined)

    if (parentNodes.length === 0 || childNodes.length === 0) return

    // Safety check: ensure parents are above children (lower Y values)
    const avgParentY =
      parentNodes.reduce((sum, p) => sum + p.y, 0) / parentNodes.length
    const avgChildY =
      childNodes.reduce((sum, c) => sum + c.y, 0) / childNodes.length

    if (avgParentY > avgChildY) {
      console.warn('[TreeEdges] Inverted relationship detected:', {
        parents: parentNodes.map((p) => ({
          name: p.member.name,
          y: p.y,
          gen: p.generation,
        })),
        children: childNodes.map((c) => ({
          name: c.member.name,
          y: c.y,
          gen: c.generation,
        })),
        avgParentY,
        avgChildY,
      })
    }

    const isHighlighted =
      parentIds.some((pid) => highlightPath.includes(pid)) &&
      childIds.some((cid) => highlightPath.includes(cid))

    // Use pure Bezier connector group for all cases
    edges.push(
      <FamilyConnectorGroup
        key={`connector-group-${parentKey}`}
        parentNodes={parentNodes}
        childNodes={childNodes}
        isHighlighted={isHighlighted}
        selectedConnections={selectedConnections}
        highlightedConnection={highlightedConnection}
        onRelationshipAnalyze={handleRelationshipAnalyze}
        onConnectionHighlight={handleConnectionHighlight}
      />,
    )
  })

  // DEBUG: Log edge count
  console.log('[TreeEdges] Generated edges:', {
    edgeCount: edges.length,
    edgeGroups: parentSetToChildren.size,
  })

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {edges}
    </div>
  )
}
