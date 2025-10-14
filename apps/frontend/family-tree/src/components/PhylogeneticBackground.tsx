/**
 * PhylogeneticBackground - Subtle wind-blown leaves animation
 * Features gentle leaves floating in a wind-like pattern
 */

'use client'

import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'

interface PhylogeneticBackgroundProps {
  opacity?: number
  scale?: number
}

export function PhylogeneticBackground({
  opacity = 0.15,
  scale = 1,
}: PhylogeneticBackgroundProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const elements: HTMLElement[] = []

    // Create wind-blown leaves
    const createWindBlownLeaf = (x: number, y: number, delay: number) => {
      const leaf = document.createElement('div')
      leaf.className = 'absolute pointer-events-none'
      leaf.innerHTML = `
                <svg width="12" height="16" viewBox="0 0 12 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M6 1C3.5 1 1.5 3.5 1.5 7C1.5 10.5 3.5 13.5 6 15C8.5 13.5 10.5 10.5 10.5 7C10.5 3.5 8.5 1 6 1Z" 
                          fill="currentColor" opacity="0.4"/>
                    <path d="M6 1L6 15" stroke="currentColor" stroke-width="0.5" opacity="0.6"/>
                </svg>
            `
      leaf.style.left = `${x}%`
      leaf.style.top = `${y}%`
      leaf.style.color =
        Math.random() > 0.5 ? 'rgb(34 197 94)' : 'rgb(101 163 13)' // green-500 or lime-600
      container.appendChild(leaf)

      // Wind-blown animation with natural movement
      const windStrength = Math.random() * 0.5 + 0.3 // 0.3 to 0.8
      const horizontalDrift = Math.random() * 200 - 100 // -100 to 100
      const rotationAmount = Math.random() * 360 + 180 // 180 to 540 degrees

      gsap.fromTo(
        leaf,
        {
          opacity: 0,
          y: -30,
          rotation: Math.random() * 45 - 22.5, // Start with slight rotation
          scale: 0.8,
        },
        {
          opacity: 0.6,
          y: window.innerHeight + 30,
          rotation: rotationAmount,
          x: `+=${horizontalDrift}`,
          scale: 1,
          duration: 12 + Math.random() * 8, // 12-20 seconds
          delay: delay,
          repeat: -1,
          ease: 'power1.inOut',
        },
      )

      // Add subtle horizontal swaying motion (wind effect)
      gsap.to(leaf, {
        x: `+=${(Math.random() * 40 - 20) * windStrength}`,
        duration: (3 + Math.random() * 2) / windStrength,
        repeat: -1,
        yoyo: true,
        ease: 'sine.inOut',
        delay: delay + Math.random() * 2,
      })

      return leaf
    }

    // Generate a small number of leaves (not overused)
    for (let i = 0; i < 4; i++) {
      elements.push(
        createWindBlownLeaf(
          Math.random() * 100, // Random horizontal position
          -30, // Start above viewport
          i * 3 + Math.random() * 2, // Staggered delays
        ),
      )
    }

    // Cleanup function
    return () => {
      elements.forEach((el) => {
        gsap.killTweensOf(el)
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      })
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{
        opacity,
        transform: `scale(${scale})`,
        transformOrigin: 'center center',
      }}
    />
  )
}
