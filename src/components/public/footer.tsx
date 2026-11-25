import Image from 'next/image'
import Link from 'next/link'
import { site } from '@/lib/env'

const NAV = [
  { href: '/#univers', label: 'Notre univers' },
  { href: '/#repertoire', label: 'Notre répertoire' },
  { href: '/#propose', label: 'Propose une tune' },
  { href: '/#concerts', label: 'Prochains concerts' },
  { href: '/vote', label: 'Voter' },
]

export function Footer() {
  return (
    <footer className="border-t border-line bg-night-ink">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-5 py-10 text-center md:flex-row md:items-start md:justify-between md:text-left">
        <Link href="/" className="block w-40 shrink-0" aria-label="Accueil JamTonic">
          <Image src="/brand/logo.png" alt="JamTonic" width={1200} height={576} sizes="10rem" />
        </Link>
        <nav aria-label="Pied de page">
          <ul className="flex flex-wrap justify-center gap-x-5 gap-y-1 md:justify-start">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="inline-flex min-h-11 items-center text-sm font-semibold hover:text-tonic">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        {/* Liens sociaux : affichés seulement s'ils sont configurés (voir .env.example). */}
        {site.socials.length > 0 ? (
          <ul className="flex gap-4">
            {site.socials.map((s) => (
              <li key={s.label}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center text-sm font-bold text-tonic"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-1 border-t border-line px-5 py-4 text-xs text-muted md:justify-between">
        <p>© {new Date().getFullYear()} JamTonic · On jamme. Vous choisissez.</p>
        <p className="flex gap-4">
          <Link href="/confidentialite" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
            Confidentialité
          </Link>
          <Link href="/espace" className="inline-flex min-h-11 items-center underline-offset-4 hover:underline">
            Espace du band
          </Link>
        </p>
      </div>
    </footer>
  )
}
