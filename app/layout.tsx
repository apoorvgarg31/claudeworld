import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({ 
  subsets: ['latin'],
  variable: '--font-mono',
})

export const metadata: Metadata = {
  title: 'ClaudeWorld | 3D Companion for Claude Code',
  description: 'Watch your AI work in a beautiful 3D virtual office. Earn XP, level up, and unlock achievements as you code with Claude.',
  keywords: ['Claude', 'AI', 'coding', 'gamification', '3D', 'developer tools'],
  authors: [{ name: 'Apy', url: 'https://github.com/apoorvgarg31' }],
  openGraph: {
    title: 'ClaudeWorld | 3D Companion for Claude Code',
    description: 'Watch your AI work in a beautiful 3D virtual office',
    type: 'website',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ClaudeWorld',
    description: 'Your AI becomes a character in a virtual office',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
