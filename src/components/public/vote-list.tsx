'use client'

import { useMemo, useRef, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { togglePublicVote } from '@/lib/actions/public'
import { normalize } from '@/lib/domain/normalize'

type Song = { id: string; title: string; artist: string; genres: string[] }

/**
 * Liste de vote. Un tap sur la carte = un vote (ou son retrait).
 * L'affichage réagit tout de suite, mais c'est le serveur qui décide :
 * en cas de refus, on revient en arrière et on explique pourquoi.
 */
export function VoteList({
  slug,
  songs,
  initialVotes,
  max,
}: {
  slug: string
  songs: Song[]
  initialVotes: string[]
  max: number | null
}) {
  const [voted, setVoted] = useState(() => new Set(initialVotes))
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [notice, setNotice] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [closed, setClosed] = useState(false)
  const lastPopped = useRef<string | null>(null)

  const visible = useMemo(() => {
    const words = normalize(query).split(' ').filter(Boolean)
    return songs.filter((s) => {
      const hay = normalize(`${s.title} ${s.artist}`)
      return words.every((w) => hay.includes(w))
    })
  }, [songs, query])

  const used = voted.size
  const limitNotice =
    max === 1
      ? 'Tu as déjà utilisé ton vote. Retire-le pour changer d’idée.'
      : `Tu as utilisé tes ${max} votes. Retires-en un pour changer d’idée.`
  const full = max !== null && used >= max

  const toggle = async (song: Song) => {
    if (busy.has(song.id) || closed) return
    const on = !voted.has(song.id)
    if (on && full) {
      setNotice(limitNotice)
      return
    }
    setNotice(null)
    lastPopped.current = song.id
    setBusy((b) => new Set(b).add(song.id))
    setVoted((v) => {
      const next = new Set(v)
      if (on) next.add(song.id)
      else next.delete(song.id)
      return next
    })

    const res = await togglePublicVote(slug, song.id, on)

    setBusy((b) => {
      const next = new Set(b)
      next.delete(song.id)
      return next
    })
    if (!res.ok) {
      // Refus du serveur : on annule le changement affiché.
      setVoted((v) => {
        const next = new Set(v)
        if (on) next.delete(song.id)
        else next.add(song.id)
        return next
      })
      if (res.reason === 'closed') setClosed(true)
      setNotice(
        {
          closed: 'Les votes viennent de fermer. Merci d’avoir participé !',
          limit: limitNotice,
          not_available: 'Cette tune n’est plus proposée ce soir.',
          slow_down: 'Wô, pas si vite ! Réessaie dans un instant.',
          error: 'Oups, ça n’a pas passé. Réessaie.',
        }[res.reason],
      )
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-5 space-y-2 border-b border-line bg-night-deep/95 px-5 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-muted">Tape sur les tunes que tu veux entendre</p>
          <p
            aria-live="polite"
            className={`display shrink-0 rounded-full px-3 py-1 text-xl ${
              full ? 'bg-tonic text-night-ink' : 'bg-surface-strong text-cream'
            }`}
          >
            {used}
            {max !== null ? ` / ${max}` : ''} vote{used > 1 ? 's' : ''}
          </p>
        </div>
        {songs.length > 10 ? (
          <div className="relative">
            <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cherche une tune ou un artiste"
              aria-label="Chercher une tune"
              className="field pl-10"
            />
          </div>
        ) : null}
        {notice ? (
          <p role="alert" className="rounded-xl bg-wood/60 px-3 py-2 text-sm font-semibold">
            {notice}
          </p>
        ) : null}
      </div>

      <ul className="mt-4 space-y-2.5">
        {visible.map((song) => {
          const on = voted.has(song.id)
          return (
            <li key={song.id}>
              <button
                type="button"
                data-testid="vote-toggle"
                aria-pressed={on}
                disabled={closed}
                onClick={() => toggle(song)}
                className={`flex min-h-[4.25rem] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-[background-color,border-color,transform] duration-150 active:scale-[0.985] ${
                  on
                    ? 'border-tonic bg-tonic text-night-ink shadow-[0_10px_26px_-12px_rgb(255_199_53/0.8)]'
                    : 'border-line bg-surface text-cream'
                } ${busy.has(song.id) ? 'opacity-80' : ''} ${closed ? 'opacity-50' : ''}`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-bold leading-tight">{song.title}</span>
                  <span className={`block truncate text-sm ${on ? 'text-night-ink/75' : 'text-muted'}`}>
                    {song.artist}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={`grid size-10 shrink-0 place-items-center rounded-full border-2 ${
                    on ? 'border-night-ink bg-night-ink text-tonic' : 'border-cream/35'
                  } ${on && lastPopped.current === song.id ? 'pop' : ''}`}
                >
                  {on ? <Check size={22} strokeWidth={3} /> : null}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {visible.length === 0 ? <p className="mt-6 text-center text-muted">Aucune tune trouvée.</p> : null}
    </div>
  )
}
