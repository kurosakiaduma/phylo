/**
 * GeneticParticles - Subtle floating particles representing genetic material
 * Creates tiny dots that float and connect briefly to suggest genetic flow
 */

'use client'

import { useRef, useEffect } from 'react'
import { gsap } from 'gsap'

interface GeneticParticlesProps {
  opacity?: number
  particleCount?: number
}

interface Particle {
  element: HTMLDivElement
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
}

export function GeneticParticles({
  opacity = 0.1,
  particleCount = 20,
}: GeneticParticlesProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>()

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const particles: HTMLElement[] = []
    
    // Initialize particles data
    particlesRef.current = []

    // Create simple visible particles for testing
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div')
      particle.className =
        'absolute w-3 h-3 rounded-full bg-purple-500 pointer-events-none'
      particle.style.left = `${Math.random() * 100}%`
      particle.style.top = `${Math.random() * 100}%`
      particle.style.opacity = '0'
      container.appendChild(particle)
      particles.push(particle)
      
      // Store particle data in ref
      particlesRef.current.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        element: particle as HTMLDivElement,
        life: 0,
        maxLife: 100
      })

      // Simple pulsing animation
      gsap.fromTo(
        particle,
        {
          opacity: 0,
          scale: 0,
        },
        {
          opacity: 0.8,
          scale: 1,
          duration: 1,
          delay: i * 0.1,
          repeat: -1,
          repeatDelay: 3,
          yoyo: true,
          ease: 'power2.inOut',
        },
      )

      // Gentle floating movement
      gsap.to(particle, {
        x: `+=${Math.random() * 100 - 50}`,
        y: `+=${Math.random() * 100 - 50}`,
        duration: 6 + Math.random() * 4,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut',
        delay: i * 0.2,
      })
    }

    // Store animation reference for cleanup
    animationRef.current = requestAnimationFrame(function animate() {
      // Animation loop could be added here if needed
      animationRef.current = requestAnimationFrame(animate)
    })

    // Cleanup
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      particles.forEach((particle) => {
        gsap.killTweensOf(particle)
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle)
        }
      })
      particlesRef.current = []
    }
  }, [particleCount, opacity])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ opacity }}
    />
  )
}
