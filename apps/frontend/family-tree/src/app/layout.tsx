import type { Metadata } from 'next'
import { Comfortaa } from 'next/font/google'
import '@/styles/globals.css'
import { Toaster } from '@/components/ui/toaster'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp'
import GlobalKeyboardShortcuts from '@/components/GlobalKeyboardShortcuts'

const comfortaa = Comfortaa({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-comfortaa',
})

export const metadata: Metadata = {
  title: 'Phylo - Family Tree Platform',
  description:
    'A modern platform for creating, managing, and visualizing family trees with collaborative features',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={comfortaa.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <GlobalKeyboardShortcuts />
            {children}
          </AuthProvider>
          <Toaster />
          <KeyboardShortcutsHelp />
        </ThemeProvider>
      </body>
    </html>
  )
}
