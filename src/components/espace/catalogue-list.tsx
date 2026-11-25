'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Search } from 'lucide-react'
import { StatusSelect } from '@/components/ui/status'
import { EmptyState } from '@/components/espace/page-header'
import { formatDuration } from '@/lib/domain/format'
import { normalize } from '@/lib/domain/normalize'
import {
  LEARNING_PRIORITY_LABEL,
  SONG_STATUSES,
  SONG_STATUS_LABEL,
  type SongStatus,
} from '@/lib/domain/types'
import type { SongListItem } from '@/lib/data/catalogue'

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-full border px-3.5 text-xs font-bold transition-colors ${
        active ? 'border-tonic bg-tonic text-night-ink' : 'border-line bg-surface text-cream'
      }`}
    >
      {children}
    </button>
  )
}

/** Recherche instantanée et filtres combinables (statut ET genre ET étiquette ET texte). */
export function CatalogueList({
  songs,
  initialStatuses,
}: {
  songs: SongListItem[]
  initialStatuses: SongStatus[]
}) {
  const [query, setQuery] = useState('')
  const [statuses, setStatuses] = useState<SongStatus[]>(initialStatuses)
  const [genres, setGenres] = useState<string[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [archived, setArchived] = useState(false)

  const allGenres = useMemo(() => [...new Set(songs.flatMap((s) => s.genres))].sort(), [songs])
  const allTags = useMemo(() => [...new Set(songs.flatMap((s) => s.tags))].sort(), [songs])
  const indexed = useMemo(
    () => songs.map((s) => ({ song: s, haystack: normalize(`${s.title} ${s.artist}`) })),
    [songs],
  )

  const visible = useMemo(() => {
    const words = normalize(query).split(' ').filter(Boolean)
    return indexed
      .filter(({ song, haystack }) => {
        if (Boolean(song.archived_at) !== archived) return false
        if (statuses.length > 0 && !statuses.includes(song.status)) return false
        if (genres.length > 0 && !genres.some((g) => song.genres.includes(g))) return false
        if (tags.length > 0 && !tags.some((t) => song.tags.includes(t))) return false
        return words.every((w) => haystack.includes(w))
      })
      .map(({ song }) => song)
  }, [indexed, query, statuses, genres, tags, archived])

  const filtered = query !== '' || statuses.length + genres.length + tags.length > 0

  return (
    <div>
      <div className="sticky top-0 z-10 -mx-4 space-y-2 bg-night-deep/90 px-4 py-3 backdrop-blur md:-mx-6 md:px-6 lg:mx-0 lg:rounded-2xl lg:px-3">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un titre ou un artiste"
            aria-label="Chercher dans le catalogue"
            className="field pl-10"
          />
        </div>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {SONG_STATUSES.map((s) => (
            <FilterChip key={s} active={statuses.includes(s)} onClick={() => setStatuses(toggle(statuses, s))}>
              {SONG_STATUS_LABEL[s]}
            </FilterChip>
          ))}
          <FilterChip active={archived} onClick={() => setArchived(!archived)}>
            Archivées
          </FilterChip>
        </div>
        {allGenres.length + allTags.length > 0 ? (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
            {allGenres.map((g) => (
              <FilterChip key={`g-${g}`} active={genres.includes(g)} onClick={() => setGenres(toggle(genres, g))}>
                {g}
              </FilterChip>
            ))}
            {allTags.map((t) => (
              <FilterChip key={`t-${t}`} active={tags.includes(t)} onClick={() => setTags(toggle(tags, t))}>
                # {t}
              </FilterChip>
            ))}
          </div>
        ) : null}
      </div>

      <p className="mb-2 mt-3 text-xs text-muted" aria-live="polite">
        {visible.length} tune{visible.length > 1 ? 's' : ''}
        {filtered ? ' avec ces critères' : ''}
      </p>

      {visible.length === 0 ? (
        <EmptyState title={filtered || archived ? 'Rien avec ces critères' : 'Le catalogue est vide'}>
          {filtered || archived
            ? 'Essaie avec moins de filtres.'
            : 'Ajoute une première tune pour démarrer le répertoire.'}
        </EmptyState>
      ) : (
        <ul className="space-y-2">
          {visible.map((song) => (
            <li key={song.id} data-testid="song-row" className="card flex items-center gap-3 p-3 pl-4">
              <Link href={`/espace/catalogue/${song.id}`} className="min-w-0 flex-1 py-1">
                <p className="truncate font-bold">{song.title}</p>
                <p className="truncate text-sm text-muted">
                  {song.artist}
                  {song.duration_seconds ? ` · ${formatDuration(song.duration_seconds)}` : ''}
                  {song.learning_priority ? ` · ${LEARNING_PRIORITY_LABEL[song.learning_priority]}` : ''}
                </p>
                {song.genres.length + song.tags.length > 0 ? (
                  <p className="mt-1 truncate text-xs text-muted">
                    {[...song.genres, ...song.tags.map((t) => `#${t}`)].join(' · ')}
                  </p>
                ) : null}
              </Link>
              <StatusSelect key={song.status} songId={song.id} status={song.status} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
