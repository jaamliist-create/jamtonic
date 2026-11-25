import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getPublicConcerts } from '@/lib/data/public'
import { formatDay } from '@/lib/domain/format'

export const metadata: Metadata = { title: 'Vote pour tes préférées' }
export const dynamic = 'force-dynamic'

/** Aiguillage : une seule soirée en cours → on y va directement. */
export default async function VotePage() {
  const concerts = await getPublicConcerts()
  const active = concerts.filter((c) => c.status === 'active')
  if (active.length === 1 && active[0]) redirect(`/s/${active[0].slug}`)

  const upcoming = concerts.filter((c) => c.status !== 'active')

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-xl place-items-center px-5 py-10">
      <div className="w-full text-center">
        <Link href="/" aria-label="Accueil JamTonic" className="mx-auto block w-44">
          <Image src="/brand/logo.png" alt="JamTonic" width={1200} height={576} priority sizes="11rem" />
        </Link>

        {active.length > 1 ? (
          <>
            <h1 className="display mt-8 text-4xl">Tu es à quelle soirée ?</h1>
            <ul className="mt-6 space-y-3">
              {active.map((c) => (
                <li key={c.slug}>
                  <Link href={`/s/${c.slug}`} className="btn btn-primary w-full text-base">
                    {c.name}
                    {c.venue ? ` · ${c.venue}` : ''}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <h1 className="display mt-8 text-4xl">Pas de jam en cours</h1>
            <p className="mx-auto mt-3 max-w-sm text-muted">
              Les votes ouvrent pendant nos concerts. Si tu es sur place, scanne le QR code affiché
              dans la salle.
            </p>
            {upcoming[0] ? (
              <p className="mt-6 rounded-2xl border border-line bg-surface p-4 text-sm">
                Prochaine jam : <strong>{upcoming[0].name}</strong>, {formatDay(upcoming[0].starts_on)}
              </p>
            ) : null}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href="/#repertoire" className="btn btn-primary">
                Découvre nos tunes
              </Link>
              <Link href="/#propose" className="btn btn-secondary">
                Propose une tune
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  )
}
