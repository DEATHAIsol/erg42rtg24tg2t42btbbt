import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Space_Grotesk } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'
import { Providers } from '@/components/Providers'
import { clerkAppearance } from '@/lib/clerk-appearance'
import { ThemeScript } from '@/components/ThemeScript'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Probio | Prediction Markets on Robinhood Chain',
    template: '%s · Probio',
  },
  description:
    'A professional trading terminal for prediction markets on Robinhood Chain. Trade outcomes, build parlays, and practice with paper trading. No account required.',
  icons: {
    icon: '/icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#0A0908',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${spaceGrotesk.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body>
        <ClerkProvider appearance={clerkAppearance}>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  )
}
