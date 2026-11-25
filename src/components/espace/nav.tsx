'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  CalendarDays,
  Compass,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Library,
  ListMusic,
  LogOut,
  Menu,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { signOut } from '@/lib/actions/auth'

type Item = { href: string; label: string; icon: LucideIcon }

const ITEMS: Item[] = [
  { href: '/espace', label: 'Tableau de bord', icon: LayoutDashboard },
  { href: '/espace/catalogue', label: 'Catalogue', icon: Library },
  { href: '/espace/a-decouvrir', label: 'À découvrir', icon: Compass },
  { href: '/espace/a-apprendre', label: 'À apprendre', icon: GraduationCap },
  { href: '/espace/playlists', label: 'Playlists', icon: ListMusic },
  { href: '/espace/sessions', label: 'Sessions', icon: CalendarDays },
  { href: '/espace/suggestions', label: 'Suggestions du public', icon: Inbox },
  { href: '/espace/statistiques', label: 'Statistiques', icon: BarChart3 },
  { href: '/espace/groupe', label: 'Groupe', icon: Users },
]

// Barre du bas : les quatre gestes les plus fréquents, le reste dans « Plus ».
const BOTTOM = ['/espace', '/espace/catalogue', '/espace/a-decouvrir', '/espace/sessions']

function isActive(pathname: string, href: string) {
  return href === '/espace' ? pathname === '/espace' : pathname.startsWith(href)
}

export function EspaceNav({ memberName, badge }: { memberName: string; badge: number }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => setOpen(false), [pathname])

  const link = (item: Item, compact = false) => {
    const active = isActive(pathname, item.href)
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        className={
          compact
            ? `flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-semibold ${
                active ? 'text-tonic' : 'text-muted'
              }`
            : `flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${
                active ? 'bg-tonic text-night-ink' : 'text-cream hover:bg-surface'
              }`
        }
      >
        <Icon size={compact ? 22 : 18} aria-hidden />
        <span className={compact ? '' : 'flex-1'}>
          {compact ? item.label.replace('Tableau de bord', 'Accueil') : item.label}
        </span>
        {!compact && item.href === '/espace/suggestions' && badge > 0 ? (
          <span className="rounded-full bg-wood px-2 py-0.5 text-xs text-cream">{badge}</span>
        ) : null}
      </Link>
    )
  }

  const logout = (
    <form action={signOut}>
      <button type="submit" className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-surface">
        <LogOut size={18} aria-hidden />
        Se déconnecter
      </button>
    </form>
  )

  return (
    <>
      {/* Ordinateur : barre latérale */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-night-ink/70 p-4 lg:flex">
        <Link href="/" className="mx-auto mb-6 block w-40" aria-label="Site public JamTonic">
          <Image src="/brand/logo.png" alt="JamTonic" width={1200} height={576} priority />
        </Link>
        <nav aria-label="Espace du band" className="flex flex-1 flex-col gap-1">
          {ITEMS.map((i) => link(i))}
        </nav>
        <div className="border-t border-line pt-3">
          <p className="px-3 pb-1 text-xs text-muted">Connecté : {memberName}</p>
          {logout}
        </div>
      </aside>

      {/* Mobile et tablette : barre du bas */}
      <nav
        aria-label="Espace du band"
        className="no-print fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-night-ink/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {ITEMS.filter((i) => BOTTOM.includes(i.href)).map((i) => link(i, true))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className={`relative flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[0.68rem] font-semibold ${
            ITEMS.some((i) => !BOTTOM.includes(i.href) && isActive(pathname, i.href))
              ? 'text-tonic'
              : 'text-muted'
          }`}
        >
          <Menu size={22} aria-hidden />
          Plus
          {badge > 0 ? (
            <span className="absolute right-[28%] top-2 size-2 rounded-full bg-tonic" aria-hidden />
          ) : null}
        </button>
      </nav>

      {open ? (
        <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Fermer le menu"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-line bg-night p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mb-2 flex items-center justify-between">
              <p className="px-3 text-sm text-muted">{memberName}</p>
              <button type="button" onClick={() => setOpen(false)} className="btn btn-ghost" aria-label="Fermer">
                <X size={20} aria-hidden />
              </button>
            </div>
            <div className="grid gap-1">
              {ITEMS.filter((i) => !BOTTOM.includes(i.href)).map((i) => link(i))}
              <Link href="/" className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-cream hover:bg-surface">
                Voir le site public
              </Link>
              {logout}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
