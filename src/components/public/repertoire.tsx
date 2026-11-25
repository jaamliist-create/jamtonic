'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { normalize } from '@/lib/domain/normalize'
import type { PublicSong } from '@/lib/domain/types'

/** Répertoire public : uniquement des tunes maîtrisées, sans notes ni statut. */
export function Repertoire({ songs }: { songs: PublicSong[] }) {
  const [query, setQuery] = useState('')
  const [genre, setGenre] = useState<string | null>(null)

  const genres = useMemo(() => [...new Set(songs.flatMap((s) => s.genres))].sort(), [songs])
  const visible = useMemo(() => {
    const words = normalize(query).split(' ').filter(Boolean)
    return songs.filter((s) => {
      if (genre && !s.genres.includes(genre)) return false
      const hay = normalize(`${s.title} ${s.artist}`)
      return words.every((w) => hay.includes(w))
    })
  }, [songs, query, genre])

  if (songs.length === 0) {
    return (
      <div className="card border-dashed px-6 py-12 text-center">
        <p className="display text-3xl">Le répertoire s’en vient</p>
        <p className="mx-auto mt-2 max-w-md text-muted">
          On peaufine nos tunes en répétition. En attendant, dis-nous ce que tu aimerais entendre !
        </p>
        <a href="#propose" className="btn btn-primary mt-6">
          Propose une tune
        </a>
      </div>
    )
  }

  return (
    <div>
      <div className="relative mx-auto max-w-xl">
        <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cherche une tune ou un artiste"
          aria-label="Chercher dans le répertoire"
          className="field rounded-full pl-11"
        />
      </div>
      {genres.length > 1 ? (
        <div className="-mx-5 mt-4 flex gap-2 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:justify-center md:px-0">
          {[null, ...genres].map((g) => (
            <button
              key={g ?? 'tout'}
              type="button"
              aria-pressed={genre === g}
              onClick={() => setGenre(g)}
              className={`min-h-11 shrink-0 rounded-full border px-4 text-sm font-bold transition-colors ${
                genre === g ? 'border-tonic bg-tonic text-night-ink' : 'border-line bg-surface text-cream'
              }`}
            >
              {g ?? 'Tout'}
            </button>
          ))}
        </div>
      ) : null}

      <p className="mt-5 text-center text-sm text-muted" aria-live="polite">
        {visible.length} tune{visible.length > 1 ? 's' : ''}
      </p>

      {visible.length === 0 ? (
        <p className="mt-6 text-center text-muted">
          Pas encore dans notre répertoire.{' '}
          <a href="#propose" className="font-bold text-tonic underline underline-offset-4">
            Propose-la !
          </a>
        </p>
      ) : (
        <ul className="mt-4 grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((song) => (
            <li
              key={song.id}
              data-testid="public-song"
              className="card flex items-center gap-3 px-4 py-3 transition-transform duration-200 hover:-translate-y-0.5 hover:border-tonic/50"
            >
              <span aria-hidden className="size-2 shrink-0 rounded-full bg-tonic shadow-[0_0_10px_var(--jt-tonic)]" />
              <div className="min-w-0">
                <p className="truncate font-bold">{song.title}</p>
                <p className="truncate text-sm text-muted">
                  {song.artist}
                  {song.genres.length > 0 ? ` · ${song.genres.join(', ')}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
