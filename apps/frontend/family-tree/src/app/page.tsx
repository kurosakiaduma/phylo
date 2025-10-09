'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ThemeToggle } from '@/components/theme-toggle'
import { LoginModal } from '@/components/auth/login-modal'
import { RegisterModal } from '@/components/auth/register-modal'
import { useAuth } from '@/hooks/use-auth'
import {
  Github,
  BookOpen,
  Info,
  LogIn,
  UserPlus,
  Users,
  Heart,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'

export default function LandingPage() {
  const [aboutOpen, setAboutOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [galleryIndex, setGalleryIndex] = useState(0)
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  // Redirect authenticated users to their trees
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/trees')
    }
  }, [isAuthenticated, isLoading, router])

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render landing page if authenticated (will redirect)
  if (isAuthenticated) {
    return null
  }

  const gallerySlides = [
    {
      title: 'Our Inspiration',
      content:
        'Phylo was born from the desire to make family history accessible and collaborative. We believe every family story deserves to be told and preserved for future generations.',
      image: '🌳',
      color: 'from-green-500/10 to-emerald-500/10',
    },
    {
      title: 'Modern Approach',
      content:
        'Built with modern web technologies, Phylo combines beautiful visualizations with powerful collaboration tools to make genealogy research enjoyable and efficient.',
      image: '💻',
      color: 'from-blue-500/10 to-cyan-500/10',
    },
    {
      title: 'Privacy First',
      content:
        "Your family data is private and secure. You control who can view and edit your tree, ensuring your family's privacy is always protected.",
      image: '🔒',
      color: 'from-purple-500/10 to-pink-500/10',
    },
    {
      title: 'Collaborative',
      content:
        'Invite family members to contribute, share stories, and build your tree together. Multiple custodians can manage and moderate content.',
      image: '👥',
      color: 'from-amber-500/10 to-orange-500/10',
    },
    {
      title: 'Beautiful Visualization',
      content:
        'Interactive tree canvas with smooth animations. Explore relationships, discover connections, and visualize your heritage in stunning detail.',
      image: '✨',
      color: 'from-rose-500/10 to-red-500/10',
    },
  ]

  const nextSlide = () =>
    setGalleryIndex((prev) => (prev + 1) % gallerySlides.length)
  const prevSlide = () =>
    setGalleryIndex(
      (prev) => (prev - 1 + gallerySlides.length) % gallerySlides.length,
    )

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header - Minimalist with just theme toggle */}
      <header className="container mx-auto px-6 py-4 flex justify-end items-center">
        <ThemeToggle />
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 pt-4 pb-2 md:pt-6 md:pb-4">
        <div className="max-w-7xl mx-auto">
          {/* Two-column layout on larger screens */}
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-12">
            {/* Left Column: Logo and Branding */}
            <div className="flex-1 w-full text-center lg:text-left -mt-24">
              {/* Logo */}
              <div className="mb-3 lg:mb-4 relative">
                {/* Soft glow behind the logo */}
                <div className="absolute inset-0 flex justify-center lg:justify-start">
                  <div className="h-56 w-56 md:h-64 md:w-64 lg:h-72 lg:w-72 rounded-full bg-green-400/20 dark:bg-green-300/10 blur-3xl" />
                </div>
                <div className="w-56 h-56 md:w-64 md:h-64 lg:w-72 lg:h-72 mx-auto lg:mx-0 relative filter drop-shadow-[0_18px_40px_rgba(34,197,94,0.45)]">
                  <svg
                    viewBox="0 0 200 200"
                    className="w-full h-full animate-tree-sway"
                    role="img"
                    aria-label="Phylo tree logo"
                  >
                    <defs>
                      <linearGradient
                        id="trunkGrad"
                        x1="0"
                        x2="0"
                        y1="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="#D97706" />
                        <stop offset="100%" stopColor="#B45309" />
                      </linearGradient>
                      <radialGradient id="leafCore" cx="50%" cy="40%" r="60%">
                        <stop offset="0%" stopColor="#86EFAC" />
                        <stop offset="60%" stopColor="#22C55E" />
                        <stop offset="100%" stopColor="#16A34A" />
                      </radialGradient>
                      <radialGradient id="leafSide" cx="40%" cy="35%" r="65%">
                        <stop offset="0%" stopColor="#A7F3D0" />
                        <stop offset="60%" stopColor="#34D399" />
                        <stop offset="100%" stopColor="#10B981" />
                      </radialGradient>
                      <filter
                        id="softGlow"
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                      >
                        <feGaussianBlur
                          stdDeviation="3.5"
                          result="coloredBlur"
                        />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* subtle sway animation on the canopy group */}
                    <g className="origin-center">
                      {/* trunk */}
                      <rect
                        x="90"
                        y="110"
                        width="20"
                        height="78"
                        rx="4"
                        fill="url(#trunkGrad)"
                        stroke="#78350F"
                        strokeWidth="3"
                        filter="url(#softGlow)"
                      />

                      {/* canopy */}
                      <g filter="url(#softGlow)">
                        {/* outer ring to increase definition */}
                        <circle
                          cx="100"
                          cy="105"
                          r="48"
                          fill="none"
                          stroke="#064E3B"
                          strokeOpacity="0.2"
                          strokeWidth="8"
                        />
                        <circle
                          cx="100"
                          cy="105"
                          r="42"
                          fill="url(#leafCore)"
                          stroke="#065F46"
                          strokeWidth="3.2"
                        />
                        <circle
                          cx="76"
                          cy="92"
                          r="30"
                          fill="url(#leafSide)"
                          stroke="#065F46"
                          strokeWidth="3.2"
                        />
                        <circle
                          cx="124"
                          cy="92"
                          r="30"
                          fill="url(#leafSide)"
                          stroke="#065F46"
                          strokeWidth="3.2"
                        />
                        {/* highlight arc */}
                        <path
                          d="M64,96 C84,66 116,66 136,96"
                          fill="none"
                          stroke="#ECFDF5"
                          strokeOpacity="0.65"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                        />
                      </g>

                      {/* family nodes */}
                      <g className="animate-node-pulse">
                        <line
                          x1="100"
                          y1="112"
                          x2="78"
                          y2="94"
                          stroke="#064E3B"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                        <line
                          x1="100"
                          y1="112"
                          x2="122"
                          y2="94"
                          stroke="#064E3B"
                          strokeWidth="4"
                          strokeLinecap="round"
                        />
                        <circle
                          cx="100"
                          cy="112"
                          r="7"
                          fill="#FFFFFF"
                          stroke="#064E3B"
                          strokeWidth="3"
                        />
                        <circle
                          cx="78"
                          cy="94"
                          r="6"
                          fill="#FFFFFF"
                          stroke="#064E3B"
                          strokeWidth="3"
                        />
                        <circle
                          cx="122"
                          cy="94"
                          r="6"
                          fill="#FFFFFF"
                          stroke="#064E3B"
                          strokeWidth="3"
                        />
                      </g>
                    </g>
                  </svg>
                </div>
              </div>

              <h1 className="sm:ml-4 md:ml-8 lg:ml-12 text-4xl md:text-6xl lg:text-7xl font-bold mb-4 lg:mb-6 animate-fade-in">
                <span className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 dark:from-green-400 dark:via-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                  Phylo
                </span>
              </h1>

              <p className="text-lg md:text-xl lg:text-2xl text-gray-600 dark:text-gray-300 mb-3 lg:mb-4 leading-relaxed animate-fade-in-delay-1">
                Discover, preserve, and share your family's story
              </p>

              <p className="text-base lg:text-lg text-gray-500 dark:text-gray-400 mb-6 lg:mb-0 max-w-xl mx-auto lg:mx-0 animate-fade-in-delay-2">
                A modern platform for creating beautiful family trees,
                collaborating with relatives, and keeping your heritage alive
                for future generations.
              </p>
            </div>

            {/* Right Column: Actions and Links */}
            <div className="flex-1 w-full max-w-md space-y-8 animate-fade-in-delay-3">
              {/* Feature Icons */}
              <div className="flex justify-around lg:justify-between gap-4">
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2 animate-bounce-slow">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Collaborate
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-2 animate-bounce-slow animation-delay-150">
                    <Heart className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Preserve
                  </span>
                </div>
                <div className="flex flex-col items-center">
                  <div className="h-12 w-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mb-2 animate-bounce-slow animation-delay-300">
                    <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-xs md:text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Visualize
                  </span>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="space-y-3">
                {/* Login Button */}
                <Button
                  size="lg"
                  onClick={() => setLoginOpen(true)}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 hover:scale-105 transition-transform"
                >
                  <LogIn className="mr-2 h-5 w-5" />
                  Sign In
                </Button>

                {/* Register Button */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setRegisterOpen(true)}
                  className="w-full hover:scale-105 transition-transform"
                >
                  <UserPlus className="mr-2 h-5 w-5" />
                  Get Started
                </Button>
              </div>

              {/* Secondary Links */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <a href="/roadmap" className="flex items-center justify-center">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Roadmap
                  </a>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <a href="/docs" className="flex items-center justify-center">
                    <BookOpen className="mr-2 h-4 w-4" />
                    Docs
                  </a>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <a
                    href="https://github.com/kurosakiaduma/phylo"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center"
                  >
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </a>
                </Button>

                {/* About Modal with Gallery */}
                <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                      <Info className="mr-2 h-4 w-4" />
                      About
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="backdrop-blur-sm max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>About Phylo</DialogTitle>
                      <DialogDescription>
                        The story behind our family tree platform
                      </DialogDescription>
                    </DialogHeader>

                    {/* Gallery Slideshow */}
                    <div className="relative">
                      <div
                        className={`min-h-[300px] p-8 rounded-lg bg-gradient-to-br ${gallerySlides[galleryIndex].color} transition-all duration-500`}
                      >
                        <div className="text-center space-y-6">
                          <div className="text-6xl mb-4 animate-pulse">
                            {gallerySlides[galleryIndex].image}
                          </div>
                          <h3 className="text-2xl font-bold">
                            {gallerySlides[galleryIndex].title}
                          </h3>
                          <p className="text-gray-700 dark:text-gray-300 max-w-xl mx-auto leading-relaxed">
                            {gallerySlides[galleryIndex].content}
                          </p>
                        </div>
                      </div>

                      {/* Navigation Controls */}
                      <div className="flex items-center justify-between mt-6">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={prevSlide}
                          className="rounded-full"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>

                        {/* Pagination Dots */}
                        <div className="flex gap-2">
                          {gallerySlides.map((_, idx) => (
                            <button
                              key={idx}
                              onClick={() => setGalleryIndex(idx)}
                              className={`h-2 rounded-full transition-all ${
                                idx === galleryIndex
                                  ? 'w-8 bg-primary'
                                  : 'w-2 bg-gray-300 dark:bg-gray-600'
                              }`}
                              aria-label={`Go to slide ${idx + 1}`}
                            />
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="icon"
                          onClick={nextSlide}
                          className="rounded-full"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Slide Counter */}
                      <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                        {galleryIndex + 1} / {gallerySlides.length}
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 text-center text-gray-500 dark:text-gray-400">
        <p>&copy; 2025 Phylo. Made with ❤️ for families everywhere.</p>
      </footer>

      {/* Auth Modals */}
      <LoginModal open={loginOpen} onOpenChange={setLoginOpen} />
      <RegisterModal open={registerOpen} onOpenChange={setRegisterOpen} />
    </div>
  )
}
