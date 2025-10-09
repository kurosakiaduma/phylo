'use client'

import { useState, ReactNode, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/hooks/use-toast'
import {
  LogOut,
  Menu,
  X,
  Trees,
  Image,
  Calendar,
  Settings,
  ChevronLeft,
  User,
  Mail,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DashboardLayoutProps {
  children: ReactNode
}

interface NavItem {
  label: string
  icon: typeof Trees
  href: string
  roles?: string[] // If specified, only show for these roles
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  // Check if we're on a tree canvas page to hide navbar by default
  const pathname = usePathname()
  const isTreeCanvasPage =
    pathname.includes('/trees/') &&
    !pathname.includes('/members') &&
    !pathname.includes('/settings') &&
    !pathname.includes('/relationships')

  const [sidebarOpen, setSidebarOpen] = useState(!isTreeCanvasPage)
  const [headerVisible, setHeaderVisible] = useState(!isTreeCanvasPage)
  const [menuBounce, setMenuBounce] = useState(false)
  const { user, logout } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  // Trigger menu bounce animation periodically when header is hidden
  useEffect(() => {
    if (!headerVisible) {
      const bounceInterval = setInterval(() => {
        setMenuBounce(true)
        setTimeout(() => setMenuBounce(false), 600)
      }, 8000) // Bounce every 8 seconds

      return () => clearInterval(bounceInterval)
    }
  }, [headerVisible])

  const handleLogout = async () => {
    try {
      await logout()
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      })
      router.push('/')
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to logout. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const navigationItems: NavItem[] = [
    { label: 'Trees', icon: Trees, href: '/trees' },
    { label: 'Gallery', icon: Image, href: '/gallery' },
    { label: 'Events', icon: Calendar, href: '/events' },
    { label: 'Invites', icon: Mail, href: '/invites' }, // For custodians to manage invites
    { label: 'Settings', icon: Settings, href: '/settings' },
  ]

  const getInitials = (name?: string | null, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    if (email) {
      return email[0].toUpperCase()
    }
    return 'U'
  }

  const toggleNavigation = () => {
    if (!headerVisible) {
      setHeaderVisible(true)
      setSidebarOpen(true)
    } else {
      setSidebarOpen(!sidebarOpen)
    }
  }

  const hideNavigation = () => {
    setHeaderVisible(false)
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Floating Menu Button - only visible when header is hidden */}
      {!headerVisible && (
        <div className="fixed top-4 left-4 z-[60]">
          <button
            onClick={toggleNavigation}
            className={cn(
              'rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all duration-300 p-3 hover:scale-110',
              menuBounce && 'animate-gentle-bounce',
            )}
            title="Show Navigation"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <header
        className={cn(
          'sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 transition-transform duration-300',
          !headerVisible && '-translate-y-full',
        )}
      >
        <div className="flex h-16 items-center justify-between px-4 md:px-6">
          {/* Left: Logo + Sidebar Toggle */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleNavigation}
              className="lg:mr-2"
            >
              {sidebarOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>

            <div className="flex items-center space-x-3">
              {/* Animated Phylo Logo */}
              <div className="w-12 h-12 flex-shrink-0 -mt-4">
                <svg
                  viewBox="0 0 200 200"
                  className="w-full h-full animate-tree-sway"
                  role="img"
                  aria-label="Phylo logo"
                >
                  <defs>
                    <linearGradient
                      id="headerTrunkGrad"
                      x1="0"
                      x2="0"
                      y1="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#D97706" />
                      <stop offset="100%" stopColor="#B45309" />
                    </linearGradient>
                    <radialGradient
                      id="headerLeafCore"
                      cx="50%"
                      cy="40%"
                      r="60%"
                    >
                      <stop offset="0%" stopColor="#86EFAC" />
                      <stop offset="60%" stopColor="#22C55E" />
                      <stop offset="100%" stopColor="#16A34A" />
                    </radialGradient>
                    <radialGradient
                      id="headerLeafSide"
                      cx="40%"
                      cy="35%"
                      r="65%"
                    >
                      <stop offset="0%" stopColor="#A7F3D0" />
                      <stop offset="60%" stopColor="#34D399" />
                      <stop offset="100%" stopColor="#10B981" />
                    </radialGradient>
                  </defs>

                  {/* Trunk */}
                  <rect
                    x="90"
                    y="110"
                    width="20"
                    height="78"
                    rx="4"
                    fill="url(#headerTrunkGrad)"
                    stroke="#78350F"
                    strokeWidth="3"
                  />

                  {/* Canopy */}
                  <g>
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
                      fill="url(#headerLeafCore)"
                      stroke="#065F46"
                      strokeWidth="3.2"
                    />
                    <circle
                      cx="76"
                      cy="92"
                      r="30"
                      fill="url(#headerLeafSide)"
                      stroke="#065F46"
                      strokeWidth="3.2"
                    />
                    <circle
                      cx="124"
                      cy="92"
                      r="30"
                      fill="url(#headerLeafSide)"
                      stroke="#065F46"
                      strokeWidth="3.2"
                    />
                    <path
                      d="M64,96 C84,66 116,66 136,96"
                      fill="none"
                      stroke="#ECFDF5"
                      strokeOpacity="0.65"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  </g>

                  {/* Family nodes */}
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
                </svg>
              </div>

              <span className="hidden sm:inline-block text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 dark:from-green-400 dark:to-blue-400 bg-clip-text text-transparent">
                Phylo
              </span>
            </div>
          </div>

          {/* Right: User Menu + Theme Toggle + Hide Button */}
          <div className="flex items-center gap-2">
            {isTreeCanvasPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={hideNavigation}
                className="text-xs"
              >
                Hide UI
              </Button>
            )}
            <ThemeToggle />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-10 w-10 rounded-full"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={
                        user?.avatar_url
                          ? `${process.env.NEXT_PUBLIC_API_URL}${user.avatar_url}`
                          : undefined
                      }
                      alt={user?.display_name || user?.email}
                    />
                    <AvatarFallback className="bg-primary/10">
                      {getInitials(user?.display_name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.display_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/profile')}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside
          className={cn(
            'fixed left-0 z-40 border-r bg-background transition-all duration-300 ease-in-out w-64',
            headerVisible ? 'top-16 h-[calc(100vh-4rem)]' : 'top-0 h-screen',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          )}
        >
          <nav
            className={cn(
              'flex flex-col gap-2 p-4',
              !headerVisible && 'pt-20', // Add top padding when header is hidden
            )}
          >
            {navigationItems.map((item) => {
              const Icon = item.icon
              const isActive = pathname.startsWith(item.href)

              return (
                <Button
                  key={item.href}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={cn(
                    'justify-start gap-3',
                    isActive &&
                      'bg-primary/10 text-primary hover:bg-primary/20',
                  )}
                  onClick={() => router.push(item.href)}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </Button>
              )
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="absolute bottom-0 left-0 right-0 border-t p-4">
            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSidebarOpen(false)}
                className="w-full justify-start"
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                <span>Collapse</span>
              </Button>
              {isTreeCanvasPage && headerVisible && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={hideNavigation}
                  className="w-full justify-start text-xs"
                >
                  <X className="h-4 w-4 mr-2" />
                  <span>Hide UI</span>
                </Button>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          className={cn(
            'flex-1 transition-all duration-300 ease-in-out',
            sidebarOpen && headerVisible ? 'lg:ml-64' : 'ml-0',
            !headerVisible && 'pt-0', // Remove top padding when header is hidden
          )}
        >
          <div
            className={cn(
              'container mx-auto',
              headerVisible ? 'p-6' : isTreeCanvasPage ? 'p-0' : 'p-6', // Remove padding for tree canvas when header is hidden
            )}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
