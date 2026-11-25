import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, DM_Sans } from 'next/font/google'
import { env } from '@/lib/env'
import { SUBTITLE } from '@/lib/domain/copy'
import './globals.css'

const display = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['700', '800'],
  style: ['italic'],
  variable: '--font-display',
  display: 'swap',
})

const body = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(env.siteUrl),
  title: { default: 'JamTonic — On jamme. Vous choisissez.', template: '%s · JamTonic' },
  description: SUBTITLE,
  applicationName: 'JamTonic',
  appleWebApp: { capable: true, title: 'JamTonic', statusBarStyle: 'black-translucent' },
  icons: { apple: '/icons/apple-touch-icon.png' },
  openGraph: {
    title: 'JamTonic — On jamme. Vous choisissez.',
    description: SUBTITLE,
    locale: 'fr_CA',
    type: 'website',
    images: ['/brand/hero-bar.webp'],
  },
}

export const viewport: Viewport = {
  themeColor: '#063B50',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr-CA" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  )
}
