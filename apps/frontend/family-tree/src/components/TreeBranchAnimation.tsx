/**
 * TreeBranchAnimation - Animated tree branch network background
 * Creates a subtle network of growing and fading phylogenetic branches
 */

'use client'

import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'

interface TreeBranchAnimationProps {
  opacity?: number
  density?: number
}

export function TreeBranchAnimation({
  opacity = 0.08,
  density = 1,
}: TreeBranchAnimationProps) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svg = svgRef.current

    // Create simple static branches first to test visibility
    const branches = [
      { x1: 10, y1: 20, x2: 30, y2: 40 },
      { x1: 30, y1: 40, x2: 50, y2: 30 },
      { x1: 30, y1: 40, x2: 50, y2: 50 },
      { x1: 70, y1: 60, x2: 90, y2: 80 },
      { x1: 20, y1: 70, x2: 40, y2: 85 },
    ]

    branches.forEach((branch, index) => {
      const path = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'path',
      )
      const pathData = `M ${branch.x1} ${branch.y1} L ${branch.x2} ${branch.y2}`

      path.setAttribute('d', pathData)
      path.setAttribute('stroke', 'currentColor')
      path.setAttribute('stroke-width', '1')
      path.setAttribute('fill', 'none')
      path.setAttribute('opacity', '0')

      svg.appendChild(path)

      // Animate the branch appearing
      gsap.fromTo(
        path,
        { opacity: 0, strokeDasharray: '100', strokeDashoffset: '100' },
        {
          opacity: 0.3,
          strokeDashoffset: '0',
          duration: 3,
          delay: index * 1.5,
          repeat: -1,
          repeatDelay: 12,
          ease: 'power2.out',
        },
      )

      // Add nodes at endpoints
      const startNode = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle',
      )
      startNode.setAttribute('cx', `${branch.x1}`)
      startNode.setAttribute('cy', `${branch.y1}`)
      startNode.setAttribute('r', '3')
      startNode.setAttribute('fill', 'currentColor')
      startNode.setAttribute('opacity', '0')
      svg.appendChild(startNode)

      const endNode = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'circle',
      )
      endNode.setAttribute('cx', `${branch.x2}`)
      endNode.setAttribute('cy', `${branch.y2}`)
      endNode.setAttribute('r', '3')
      endNode.setAttribute('fill', 'currentColor')
      endNode.setAttribute('opacity', '0')
      svg.appendChild(endNode)

      // Animate nodes
      gsap.fromTo(
        [startNode, endNode],
        { opacity: 0, scale: 0 },
        {
          opacity: 0.4,
          scale: 1,
          duration: 1,
          delay: index * 1.5 + 1,
          repeat: -1,
          repeatDelay: 13.5,
          ease: 'back.out(1.7)',
        },
      )
    })

    // Cleanup function
    return () => {
      // Clear SVG content
      while (svg.firstChild) {
        svg.removeChild(svg.firstChild)
      }
    }
  }, [density])

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 w-full h-full pointer-events-none text-slate-400 dark:text-slate-600"
      style={{ opacity }}
      preserveAspectRatio="none"
      viewBox="0 0 100 100"
    />
  )
}
