import Link from 'next/link'
import { CalendarDays, MapPin } from 'lucide-react'
import { Footer } from '@/components/public/footer'
import { Hero } from '@/components/public/hero'
import { Repertoire } from '@/components/public/repertoire'
import { SuggestForm } from '@/components/public/suggest-form'
import { getPublicConcerts, getPublicSongs } from '@/lib/data/public'
import { formatDay, formatTime } from '@/lib/domain/format'

// Toujours à jour : une tune qui quitte « Maîtrisé » disparaît au chargement suivant.
export const dynamic = 'force-dynamic'

const UNIVERS = [
  {
    title: 'On jamme',
    text: 'Jammer, c’est jouer entre musiciens pour le plaisir, en laissant de la place à la spontanéité. Nos soirées ne sont jamais figées d’avance.',
  },
  {
    title: 'Le côté tonic',
    text: 'Comme un bon gin tonic : des bulles, de la fraîcheur et une ambiance de bar où on se sent bien dès la première tune.',
  },
  {
    title: 'Des reprises',
    text: 'Des musiciens, du rock et de la pop. Des tunes qu’on a du fun à jouer et que tu as envie de chanter.',
  },
  {
    title: 'Tu choisis',
    text: 'Découvre notre répertoire, vote pour tes préférées, propose-en de nouvelles. Le band garde le dernier mot, mais la soirée se construit avec toi.',
  },
]

function SectionTitle({ id, kicker, children }: { id: string; kicker: string; children: React.ReactNode }) {
  return (
    <header className="mb-8 text-center">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-tonic">{kicker}</p>
      <h2 id={id} className="display mt-2 text-5xl md:text-6xl">
        {children}
      </h2>
    </header>
  )
}

export default async function HomePage() {
  const [songs, concerts] = await Promise.all([getPublicSongs(), getPublicConcerts()])
  const live = concerts.some((c) => c.status === 'active' && c.voting_open)

  return (
    <>
      <main>
        <Hero voteLive={live} />

        <section id="univers" aria-labelledby="univers-titre" className="scroll-mt-6 px-5 py-20">
          <div className="mx-auto max-w-6xl">
            <SectionTitle id="univers-titre" kicker="Jam + Tonic">
              Notre univers
            </SectionTitle>
            <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {UNIVERS.map((u, i) => (
                <li key={u.title} className="card relative overflow-hidden p-6">
                  <span aria-hidden className="display absolute -right-2 -top-4 text-8xl text-cream/5">
                    {i + 1}
                  </span>
                  <h3 className="display text-3xl text-tonic">{u.title}</h3>
                  <p className="mt-3 leading-relaxed text-cream/85">{u.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section
          id="repertoire"
          aria-labelledby="repertoire-titre"
          className="scroll-mt-6 bg-[linear-gradient(180deg,transparent,rgb(6_59_80/0.55)_20%,rgb(6_59_80/0.55)_80%,transparent)] px-5 py-20"
        >
          <div className="mx-auto max-w-6xl">
            <SectionTitle id="repertoire-titre" kicker="Ce qu’on peut te jouer">
              Notre répertoire
            </SectionTitle>
            <Repertoire songs={songs} />
          </div>
        </section>

        <section id="propose" aria-labelledby="propose-titre" className="scroll-mt-6 px-5 py-20">
          <div className="mx-auto max-w-2xl">
            <SectionTitle id="propose-titre" kicker="Il nous en manque une ?">
              Propose une tune
            </SectionTitle>
            <div className="relative overflow-hidden rounded-[1.75rem] border border-wood-glow/40 bg-[linear-gradient(160deg,rgb(117_64_39/0.55),rgb(117_64_39/0.18))] p-6 shadow-[var(--jt-shadow)] md:p-8">
              <p className="mb-5 text-cream/90">
                Dis-nous quelle chanson tu aimerais entendre. On ne promet rien pour ce soir, mais on
                lit tout.
              </p>
              <SuggestForm />
            </div>
          </div>
        </section>

        <section id="concerts" aria-labelledby="concerts-titre" className="scroll-mt-6 px-5 pb-24 pt-8">
          <div className="mx-auto max-w-3xl">
            <SectionTitle id="concerts-titre" kicker="Viens nous voir">
              Prochains concerts
            </SectionTitle>
            {concerts.length === 0 ? (
              <div className="card border-dashed px-6 py-12 text-center">
                <p className="display text-3xl">Pas de date annoncée pour l’instant</p>
                <p className="mx-auto mt-2 max-w-md text-muted">
                  La prochaine jam se prépare. Repasse bientôt !
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {concerts.map((c) => (
                  <li key={c.slug} className="card flex flex-wrap items-center gap-4 p-5">
                    <div className="min-w-0 flex-1">
                      <p className="display text-3xl">{c.name}</p>
                      <p className="mt-2 flex items-center gap-2 text-sm text-cream/85">
                        <CalendarDays size={16} className="shrink-0 text-tonic" aria-hidden />
                        <span className="first-letter:uppercase">
                          {formatDay(c.starts_on)}
                          {c.starts_at ? ` · ${formatTime(c.starts_at)}` : ''}
                        </span>
                      </p>
                      {c.venue ? (
                        <p className="mt-1 flex items-center gap-2 text-sm text-cream/85">
                          <MapPin size={16} className="shrink-0 text-tonic" aria-hidden />
                          {c.venue}
                        </p>
                      ) : null}
                    </div>
                    {c.status === 'active' ? (
                      <Link href={`/s/${c.slug}`} className="btn btn-primary">
                        <span className="size-2.5 animate-pulse rounded-full bg-night-ink" aria-hidden />
                        {c.voting_open ? 'Ça joue : vote !' : 'Ça joue en ce moment'}
                      </Link>
                    ) : (
                      <Link href={`/s/${c.slug}`} className="btn btn-secondary">
                        Voir la soirée
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
