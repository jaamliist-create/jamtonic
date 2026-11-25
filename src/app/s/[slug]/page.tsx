import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SuggestForm } from '@/components/public/suggest-form'
import { VoteList } from '@/components/public/vote-list'
import { getMyVotes, getPublicSession, getPublicSessionSongs } from '@/lib/data/public'
import { formatDay, formatTime } from '@/lib/domain/format'

export const metadata: Metadata = {
  title: 'Vote pour tes préférées',
  robots: { index: false },
}

const SLUG_RE = /^[a-z0-9]{6,20}$/

/** Page d'une soirée : la cible du QR code. Pensée pour un téléphone, dans un bar. */
export default async function SessionPublicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!SLUG_RE.test(slug)) notFound()
  const session = await getPublicSession(slug)
  if (!session) notFound()

  const canVote = session.status === 'active' && session.voting_open
  const [songs, myVotes] = canVote
    ? await Promise.all([getPublicSessionSongs(slug), getMyVotes(slug)])
    : [[], []]
  // Un vote sur une tune retirée de la sélection ne compte plus dans l'affichage.
  const songIds = new Set(songs.map((s) => s.id))

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top,var(--jt-night),var(--jt-night-deep)_55%)]">
      <main className="mx-auto w-full max-w-2xl px-5 pb-16">
        <header className="pt-6 text-center">
          <Link href="/" aria-label="Accueil JamTonic" className="mx-auto block w-40">
            <Image src="/brand/logo.png" alt="JamTonic" width={1200} height={576} priority sizes="10rem" />
          </Link>
          <h1 className="display mt-4 text-4xl">{session.name}</h1>
          <p className="mt-1 text-sm text-muted first-letter:uppercase">
            {formatDay(session.starts_on)}
            {session.starts_at ? ` · ${formatTime(session.starts_at)}` : ''}
            {session.venue ? ` · ${session.venue}` : ''}
          </p>
        </header>

        <div className="mt-6">
          {session.status === 'terminee' ? (
            <div className="card px-6 py-10 text-center">
              <p className="display text-4xl text-tonic">Merci pour la soirée !</p>
              <p className="mx-auto mt-3 max-w-sm text-cream/85">
                Les votes sont terminés. On s’est bien amusés, et tes choix nous aident à préparer la
                prochaine jam.
              </p>
              <Link href="/#concerts" className="btn btn-primary mt-6">
                Prochains concerts
              </Link>
            </div>
          ) : session.status === 'programmee' ? (
            <div className="card px-6 py-10 text-center">
              <p className="display text-4xl text-tonic">Ça s’en vient !</p>
              <p className="mx-auto mt-3 max-w-sm text-cream/85">
                Les votes ouvriront quand le band montera sur scène. Garde cette page ouverte ou
                rescanne le code à ce moment-là.
              </p>
              <Link href="/#repertoire" className="btn btn-secondary mt-6">
                Découvre nos tunes
              </Link>
            </div>
          ) : !session.voting_open ? (
            <div className="card px-6 py-10 text-center">
              <p className="display text-4xl text-tonic">Votes en pause</p>
              <p className="mx-auto mt-3 max-w-sm text-cream/85">
                Le band a fermé les votes pour le moment. Profite du show !
              </p>
            </div>
          ) : songs.length === 0 ? (
            <div className="card px-6 py-10 text-center">
              <p className="display text-3xl">La liste arrive</p>
              <p className="mx-auto mt-3 max-w-sm text-muted">
                Le band n’a pas encore choisi les tunes de ce soir. Reviens dans une minute.
              </p>
            </div>
          ) : (
            <VoteList
              slug={slug}
              songs={songs}
              initialVotes={myVotes.filter((id) => songIds.has(id))}
              max={session.max_votes_per_participant}
            />
          )}
        </div>

        {session.status !== 'terminee' ? (
          <section aria-labelledby="propose" className="mt-10 rounded-[1.75rem] border border-wood-glow/40 bg-[linear-gradient(160deg,rgb(117_64_39/0.55),rgb(117_64_39/0.18))] p-5">
            <h2 id="propose" className="display text-3xl">
              Il en manque une ?
            </h2>
            <p className="mb-4 mt-1 text-sm text-cream/85">Propose une tune qu’on devrait apprendre.</p>
            <SuggestForm slug={slug} />
          </section>
        ) : null}

        <p className="mt-8 text-center text-xs text-muted">
          Le band choisit toujours ce qu’il joue : tes votes l’inspirent. Pas de compte : on retient
          tes choix avec un témoin anonyme.{' '}
          <Link href="/confidentialite" className="underline underline-offset-4">
            En savoir plus
          </Link>
        </p>
      </main>
    </div>
  )
}
