'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { TreePine, Home, ArrowLeft, Search } from 'lucide-react'

export default function NotFound() {
  const router = useRouter()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 px-4 dark:from-gray-900 dark:to-gray-800">
      <div className="text-center space-y-6">
        {/* Logo/Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-white p-6 shadow-lg dark:bg-gray-800">
            <TreePine className="h-16 w-16 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Error Code */}
        <div className="space-y-2">
          <h1 className="text-8xl font-bold text-emerald-600 dark:text-emerald-400">
            404
          </h1>
          <h2 className="text-3xl font-semibold text-gray-800 dark:text-gray-100">
            Page Not Found
          </h2>
        </div>

        {/* Description */}
        <p className="mx-auto max-w-md text-lg text-gray-600 dark:text-gray-300">
          We couldn't find the family tree branch you're looking for. It might
          have been moved, deleted, or never existed.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="lg"
            className="w-full sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>

          <Link href="/trees" className="w-full sm:w-auto">
            <Button size="lg" className="w-full">
              <TreePine className="mr-2 h-4 w-4" />
              My Trees
            </Button>
          </Link>

          <Link href="/" className="w-full sm:w-auto">
            <Button variant="ghost" size="lg" className="w-full">
              <Home className="mr-2 h-4 w-4" />
              Home
            </Button>
          </Link>
        </div>

        {/* Additional Help */}
        <div className="pt-8 text-sm text-gray-500 dark:text-gray-400">
          <p>Need help finding your way?</p>
          <Link
            href="/trees"
            className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-medium"
          >
            <Search className="h-4 w-4" />
            Browse all family trees
          </Link>
        </div>
      </div>
    </div>
  )
}
