'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowDown, ArrowUp, GripVertical, Plus, Search, X } from 'lucide-react'
import {
  addSongToPlaylist,
  removeSongFromPlaylist,
  reorderPlaylist,
} from '@/lib/actions/playlists'
import { StatusBadge } from '@/components/ui/status'
import { EmptyState } from '@/components/espace/page-header'
import { formatDuration, formatTotalDuration } from '@/lib/domain/format'
import { normalize } from '@/lib/domain/normalize'
import type { SongStatus } from '@/lib/domain/types'

export type PlaylistSong = {
  id: string
  title: string
  artist: string
  status: SongStatus
  duration_seconds: number | null
}

function Row({
  song,
  index,
  last,
  disabled,
  onMove,
  onRemove,
}: {
  song: PlaylistSong
  index: number
  last: boolean
  disabled: boolean
  onMove: (from: number, to: number) => void
  onRemove: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: song.id,
  })
  return (
    <li
      ref={setNodeRef}
      data-testid="playlist-item"
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`card flex items-center gap-1 p-2 ${isDragging ? 'relative z-10 border-tonic bg-night shadow-[var(--jt-shadow)]' : ''}`}
    >
      {/* La poignée seule capte le glissement : la page continue de défiler ailleurs. */}
      <button
        type="button"
        aria-label={`Déplacer ${song.title}`}
        className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-xl text-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={20} aria-hidden />
      </button>
      <span className="w-6 shrink-0 text-center text-sm font-bold text-muted">{index + 1}</span>
      <div className="min-w-0 flex-1 px-1">
        <p className="truncate font-bold">{song.title}</p>
        <p className="flex items-center gap-2 truncate text-sm text-muted">
          <span className="truncate">{song.artist}</span>
          {song.duration_seconds ? <span>· {formatDuration(song.duration_seconds)}</span> : null}
        </p>
        <div className="mt-1">
          <StatusBadge status={song.status} />
        </div>
      </div>
      <div className="flex shrink-0 flex-col sm:flex-row">
        <button
          type="button"
          aria-label={`Monter ${song.title}`}
          disabled={disabled || index === 0}
          onClick={() => onMove(index, index - 1)}
          className="grid size-11 place-items-center rounded-xl text-cream disabled:opacity-25"
        >
          <ArrowUp size={18} aria-hidden />
        </button>
        <button
          type="button"
          aria-label={`Descendre ${song.title}`}
          disabled={disabled || last}
          onClick={() => onMove(index, index + 1)}
          className="grid size-11 place-items-center rounded-xl text-cream disabled:opacity-25"
        >
          <ArrowDown size={18} aria-hidden />
        </button>
      </div>
      <button
        type="button"
        aria-label={`Retirer ${song.title} de la playlist`}
        disabled={disabled}
        onClick={() => onRemove(song.id)}
        className="grid size-11 shrink-0 place-items-center rounded-xl text-danger"
      >
        <X size={18} aria-hidden />
      </button>
    </li>
  )
}

export function PlaylistEditor({
  playlistId,
  initial,
  catalogue,
}: {
  playlistId: string
  initial: PlaylistSong[]
  catalogue: PlaylistSong[]
}) {
  const router = useRouter()
  const [items, setItems] = useState(initial)
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const persistOrder = (next: PlaylistSong[], previous: PlaylistSong[]) => {
    setItems(next)
    setError(null)
    startTransition(async () => {
      const res = await reorderPlaylist(
        playlistId,
        next.map((s) => s.id),
      )
      if (!res.ok) {
        setItems(previous)
        setError(res.error)
      }
    })
  }

  const move = (from: number, to: number) => persistOrder(arrayMove(items, from, to), items)

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = items.findIndex((s) => s.id === active.id)
    const to = items.findIndex((s) => s.id === over.id)
    if (from >= 0 && to >= 0) move(from, to)
  }

  const remove = (id: string) => {
    const previous = items
    setItems(items.filter((s) => s.id !== id))
    startTransition(async () => {
      const res = await removeSongFromPlaylist(playlistId, id)
      if (!res.ok) {
        setItems(previous)
        setError(res.error)
      } else router.refresh()
    })
  }

  const add = (song: PlaylistSong) => {
    const previous = items
    setItems([...items, song])
    startTransition(async () => {
      const res = await addSongToPlaylist(playlistId, song.id)
      if (!res.ok) {
        setItems(previous)
        setError(res.error)
      } else router.refresh()
    })
  }

  const inList = useMemo(() => new Set(items.map((s) => s.id)), [items])
  const candidates = useMemo(() => {
    const words = normalize(query).split(' ').filter(Boolean)
    return catalogue
      .filter((s) => !inList.has(s.id))
      .filter((s) => {
        const hay = normalize(`${s.title} ${s.artist}`)
        return words.every((w) => hay.includes(w))
      })
      .slice(0, query ? 30 : 8)
  }, [catalogue, inList, query])

  const total = items.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0)
  const unknown = items.filter((s) => !s.duration_seconds).length

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <section aria-labelledby="ordre">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="ordre" className="display text-2xl">
            {items.length} tune{items.length > 1 ? 's' : ''}
          </h2>
          <p className="text-sm text-muted">
            Durée estimée : <strong className="text-cream">{formatTotalDuration(total)}</strong>
            {unknown > 0 ? ` · ${unknown} sans durée` : ''}
          </p>
        </div>
        {error ? (
          <p role="alert" className="mb-2 text-sm text-danger">
            {error}
          </p>
        ) : null}
        {items.length === 0 ? (
          <EmptyState title="Playlist vide">Ajoute des tunes depuis le catalogue, peu importe leur statut.</EmptyState>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={items.map((s) => s.id)} strategy={verticalListSortingStrategy}>
              <ol className="space-y-2">
                {items.map((song, i) => (
                  <Row
                    key={song.id}
                    song={song}
                    index={i}
                    last={i === items.length - 1}
                    disabled={pending}
                    onMove={move}
                    onRemove={remove}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
      </section>

      <section aria-labelledby="ajouter" className="card h-fit p-4">
        <h2 id="ajouter" className="display mb-3 text-2xl">
          Ajouter des tunes
        </h2>
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher dans le catalogue"
            aria-label="Chercher une tune à ajouter"
            className="field pl-10"
          />
        </div>
        <ul className="mt-3 space-y-1">
          {candidates.map((song) => (
            <li key={song.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => add(song)}
                className="flex min-h-12 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-surface"
              >
                <Plus size={18} className="shrink-0 text-tonic" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">{song.title}</span>
                  <span className="block truncate text-xs text-muted">{song.artist}</span>
                </span>
                <StatusBadge status={song.status} />
              </button>
            </li>
          ))}
        </ul>
        {candidates.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            {catalogue.length === inList.size ? 'Tout le catalogue est déjà dans la playlist.' : 'Aucune tune trouvée.'}
          </p>
        ) : null}
      </section>
    </div>
  )
}
