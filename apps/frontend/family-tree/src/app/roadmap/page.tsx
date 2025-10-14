import { Metadata } from 'next'
import Link from 'next/link'
import React from 'react'
import {
  CheckCircle2,
  Clock,
  Rocket,
  Lightbulb,
  ArrowRight,
  Users,
  Image,
  Globe,
  Zap,
  Shield,
  BarChart3,
  FileText,
  Heart,
  GitBranch,
  CalendarDays,
  MessageSquare,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'Roadmap - Phylo',
  description: 'See what features we are working on and what is coming next to Phylo.',
}

interface Feature {
  id: string
  title: string
  description: string
  status: 'completed' | 'in-progress' | 'planned' | 'future'
  icon: React.ElementType;
  category: 'core' | 'ux' | 'data' | 'infrastructure' | 'community'
  estimatedRelease?: string
}

const features: Feature[] = [
  // COMPLETED (MVP)
  {
    id: 'magic-auth',
    title: 'Magic Link Authentication',
    description: 'Secure, passwordless login via email magic links',
    status: 'completed',
    icon: Shield,
    category: 'core',
  },
  {
    id: 'tree-viz',
    title: 'Interactive Tree Visualization',
    description: 'Beautiful, animated family tree canvas with pan, zoom, and search',
    status: 'completed',
    icon: GitBranch,
    category: 'core',
  },
  {
    id: 'member-management',
    title: 'Member & Relationship Management',
    description: 'Add, edit, and manage family members and their relationships',
    status: 'completed',
    icon: Users,
    category: 'core',
  },
  {
    id: 'custodial-controls',
    title: 'Custodial Controls',
    description: 'Tree custodians can manage permissions and invite family members',
    status: 'completed',
    icon: Shield,
    category: 'core',
  },
  {
    id: 'lineage-trace',
    title: 'Lineage Traceability',
    description: 'Highlight ancestry paths from any member to tree roots',
    status: 'completed',
    icon: ArrowRight,
    category: 'ux',
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    description: 'Power user shortcuts for navigation and canvas control',
    status: 'completed',
    icon: Zap,
    category: 'ux',
  },
  {
    id: 'responsive-design',
    title: 'Responsive Design',
    description: 'Works beautifully on mobile, tablet, and desktop devices',
    status: 'completed',
    icon: Globe,
    category: 'ux',
  },

  // IN PROGRESS
  {
    id: 'relationship-analysis',
    title: 'Relationship Analysis',
    description: 'Discover how any two family members are connected',
    status: 'in-progress',
    icon: GitBranch,
    category: 'core',
    estimatedRelease: 'Q4 2025',
  },
  {
    id: 'tree-export',
    title: 'High-Quality Tree Export',
    description: 'Download beautiful images of your family tree',
    status: 'in-progress',
    icon: Image,
    category: 'data',
    estimatedRelease: 'Q4 2025',
  },

  // PLANNED (Next Quarter)
  {
    id: 'media-attachments',
    title: 'Photos & Documents',
    description: 'Attach photos, documents, and media to family members',
    status: 'planned',
    icon: Image,
    category: 'data',
    estimatedRelease: 'Q1 2026',
  },
  {
    id: 'family-stories',
    title: 'Family Stories & Narratives',
    description: 'Share and preserve family stories, memories, and oral histories',
    status: 'planned',
    icon: MessageSquare,
    category: 'community',
    estimatedRelease: 'Q1 2026',
  },
  {
    id: 'timeline-view',
    title: 'Timeline View',
    description: 'View family history chronologically with major life events',
    status: 'planned',
    icon: CalendarDays,
    category: 'ux',
    estimatedRelease: 'Q1 2026',
  },
  {
    id: 'gedcom-import',
    title: 'GEDCOM Import/Export',
    description: 'Import and export family trees in standard GEDCOM format',
    status: 'planned',
    icon: FileText,
    category: 'data',
    estimatedRelease: 'Q1 2026',
  },

  // FUTURE (Backlog)
  {
    id: 'non-monogamous',
    title: 'Non-Monogamous Relationships',
    description: 'Support for complex modern family structures',
    status: 'future',
    icon: Heart,
    category: 'core',
  },
  {
    id: 'advanced-layouts',
    title: 'Advanced Tree Layouts',
    description: 'Circular, radial, and other visualization styles',
    status: 'future',
    icon: GitBranch,
    category: 'ux',
  },
  {
    id: 'i18n',
    title: 'Multi-Language Support',
    description: 'Use Phylo in your preferred language',
    status: 'future',
    icon: Globe,
    category: 'infrastructure',
  },
  {
    id: 'analytics',
    title: 'Family Statistics & Insights',
    description: 'Visualize family demographics, patterns, and trends',
    status: 'future',
    icon: BarChart3,
    category: 'data',
  },
  {
    id: 'collaboration',
    title: 'Real-time Collaboration',
    description: 'Multiple family members editing the tree simultaneously',
    status: 'future',
    icon: Users,
    category: 'core',
  },
  {
    id: 'dna-integration',
    title: 'DNA Test Integration',
    description: 'Connect with DNA test results from major providers',
    status: 'future',
    icon: Lightbulb,
    category: 'data',
  },
]

const statusConfig = {
  completed: {
    label: 'Released',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: CheckCircle2,
  },
  'in-progress': {
    label: 'In Development',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    icon: Zap,
  },
  planned: {
    label: 'Coming Soon',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    icon: Clock,
  },
  future: {
    label: 'Future',
    color: 'text-slate-600 dark:text-slate-400',
    bg: 'bg-slate-50 dark:bg-slate-900/20',
    border: 'border-slate-200 dark:border-slate-800',
    icon: Lightbulb,
  },
}

const categoryConfig = {
  core: { label: 'Core Features', color: 'text-purple-600 dark:text-purple-400' },
  ux: { label: 'User Experience', color: 'text-pink-600 dark:text-pink-400' },
  data: { label: 'Data & Import/Export', color: 'text-cyan-600 dark:text-cyan-400' },
  infrastructure: {
    label: 'Infrastructure',
    color: 'text-orange-600 dark:text-orange-400',
  },
  community: { label: 'Community', color: 'text-green-600 dark:text-green-400' },
}

export default function RoadmapPage() {
  const completedFeatures = features.filter((f) => f.status === 'completed')
  const inProgressFeatures = features.filter((f) => f.status === 'in-progress')
  const plannedFeatures = features.filter((f) => f.status === 'planned')
  const futureFeatures = features.filter((f) => f.status === 'future')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent"
            >
              Phylo
            </Link>
            <nav className="flex items-center gap-6">
              <Link
                href="/about"
                className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                About
              </Link>
              <Link
                href="/roadmap"
                className="text-emerald-600 dark:text-emerald-400 font-medium"
              >
                Roadmap
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors"
              >
                Get Started
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-full mb-6">
          <Rocket className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Product Roadmap
          </span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6">
          Building the Future of
          <br />
          <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
            Family Tree Preservation
          </span>
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto mb-8">
          See what we&apos;ve built, what we&apos;re working on, and what&apos;s coming
          next. We&apos;re committed to transparency and building features you need.
        </p>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
              {completedFeatures.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Released</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">
              {inProgressFeatures.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">In Development</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="text-3xl font-bold text-amber-600 dark:text-amber-400 mb-2">
              {plannedFeatures.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Coming Soon</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
            <div className="text-3xl font-bold text-slate-600 dark:text-slate-400 mb-2">
              {futureFeatures.length}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Future Plans</div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="container mx-auto px-4 pb-24">
        {/* Completed Features */}
        <FeatureSection
          title="✅ Released Features"
          subtitle="Available now in Phylo MVP"
          features={completedFeatures}
        />

        {/* In Progress */}
        <FeatureSection
          title="⚡ In Active Development"
          subtitle="We're working on these right now"
          features={inProgressFeatures}
        />

        {/* Planned */}
        <FeatureSection
          title="📅 Coming Soon"
          subtitle="Next quarter's priorities"
          features={plannedFeatures}
        />

        {/* Future */}
        <FeatureSection
          title="🔮 Future Vision"
          subtitle="On our radar for future development"
          features={futureFeatures}
        />
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 pb-24">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-12 text-center text-white">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Help Shape the Future
          </h2>
          <p className="text-xl text-emerald-50 mb-8 max-w-2xl mx-auto">
            Have a feature request or suggestion? We&apos;d love to hear from you!
            Your feedback helps us prioritize what matters most.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/login"
              className="px-8 py-4 bg-white text-emerald-600 rounded-lg font-medium hover:bg-emerald-50 transition-colors inline-flex items-center justify-center gap-2"
            >
              Start Building Your Tree
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="mailto:support@taduma.me?subject=Phylo Feature Request"
              className="px-8 py-4 bg-emerald-700 text-white rounded-lg font-medium hover:bg-emerald-800 transition-colors"
            >
              Send Feedback
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-12">
        <div className="container mx-auto px-4 text-center text-slate-600 dark:text-slate-400">
          <p className="mb-4">
            &copy; {new Date().getFullYear()} Phylo. Built with ❤️ for families
            everywhere.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <Link href="/about" className="hover:text-slate-900 dark:hover:text-white">
              About
            </Link>
            <Link
              href="/roadmap"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Roadmap
            </Link>
            <a
              href="mailto:support@taduma.me"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureSection({
  title,
  subtitle,
  features,
}: {
  title: string
  subtitle: string
  features: Feature[]
}) {
  if (features.length === 0) return null

  return (
    <div className="mb-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
          {title}
        </h2>
        <p className="text-slate-600 dark:text-slate-400">{subtitle}</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature) => {
          const statusInfo = statusConfig[feature.status]
          const StatusIcon = statusInfo.icon
          const FeatureIcon = feature.icon
          const categoryInfo = categoryConfig[feature.category]

          return (
            <div
              key={feature.id}
              className={`bg-white dark:bg-slate-800 rounded-xl p-6 border-2 ${statusInfo.border} hover:shadow-lg transition-all`}
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className={`p-3 ${statusInfo.bg} rounded-lg`}
                >
                  <FeatureIcon className={`w-6 h-6 ${statusInfo.color}`} />
                </div>
                <div className={`px-3 py-1 ${statusInfo.bg} rounded-full`}>
                  <div className="flex items-center gap-1.5">
                    <StatusIcon className={`w-3.5 h-3.5 ${statusInfo.color}`} />
                    <span className={`text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              </div>

              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {feature.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                {feature.description}
              </p>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                <span className={`text-xs font-medium ${categoryInfo.color}`}>
                  {categoryInfo.label}
                </span>
                {feature.estimatedRelease && (
                  <span className="text-xs text-slate-500 dark:text-slate-500">
                    Est. {feature.estimatedRelease}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
