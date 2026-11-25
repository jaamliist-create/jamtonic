'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Search, TrendingUp } from 'lucide-react'
import {
  applySessionPlaylist,
  saveSession,
  setSessionSongs,
  setSessionStatus,
  setVotingOpen,
} from '@/lib/actions/sessions'
import { FormMessage, SubmitButton, useActionForm } from '@/components/ui/form'
import { StatusBadge } from '@/components/ui/status'
import { normalize } from '@/lib/domain/normalize'
import {
  SESSION_STATUSES,
  SESSION_STATUS_LABEL,
  type ActionResult,
  type SessionStatus,
  type SongStatus,
} from '@/lib/domain/types'

export type SessionFormValues = {
  id?: string
  name: string
  venue: string
  starts_on: string
  starts_at: string
  listed: boolean
  voting_open: boolean
  max_votes: number | null
}

export function SessionForm({ session }: { session: SessionFormValues }) {
  const router = useRouter()
  const { state, onSubmit, pending } = useActionForm(saveSession, null)

  useEffect(() => {
    if (state?.ok && !session.id && state.id) router.push(`/espace/sessions/${state.id}`)
  }, [state, session.id, router])

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {session.id ? <input type="hidden" name="id" value={session.id} /> : null}
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="s-name">
            Nom
          </label>
          <input id="s-name" name="name" required maxLength={100} defaultValue={session.name} placeholder="Ex. : Soirée au pub" className="field" />
        </div>
        <div>
          <label className="label" htmlFor="s-venue">
            Lieu (facultatif)
          </label>
          <input id="s-venue" name="venue" maxLength={120} defaultValue={session.venue} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="s-date">
            Date
          </label>
          <input id="s-date" name="starts_on" type="date" required defaultValue={session.starts_on} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="s-time">
            Heure (facultatif)
          </label>
          <input id="s-time" name="starts_at" type="time" defaultValue={session.starts_at} className="field" />
        </div>
      </div>

      <fieldset className="space-y-3 rounded-2xl border border-line p-4">
        <legend className="px-2 text-sm font-bold">Paramètres de vote</legend>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="voting_open" defaultChecked={session.voting_open} className="size-5 accent-[var(--jt-tonic)]" />
          <span>Votes ouverts quand la session est active</span>
        </label>
        <label className="flex min-h-11 items-center gap-3">
          <input type="checkbox" name="listed" defaultChecked={session.listed} className="size-5 accent-[var(--jt-tonic)]" />
          <span>Afficher dans « Prochains concerts » sur le site public</span>
        </label>
        <div className="max-w-xs">
          <label className="label" htmlFor="s-max">
            Votes maximum par personne (vide = illimité)
          </label>
          <input
            id="s-max"
            name="max_votes"
            inputMode="numeric"
            maxLength={3}
            defaultValue={session.max_votes ?? ''}
            className="field"
          />
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending}>{session.id ? 'Enregistrer' : 'Créer la session'}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

/** Statut de la session et ouverture des votes : les deux manettes du soir du show. */
export function SessionControls({
  id,
  status,
  votingOpen,
}: {
  id: string
  status: SessionStatus
  votingOpen: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => {
      setError(null)
      const res = await fn()
      if (res.ok) router.refresh()
      else setError(res.error)
    })

  return (
    <div className="space-y-3">
      <div role="group" aria-label="Statut de la session" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SESSION_STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            aria-pressed={status === s}
            disabled={pending || status === s}
            onClick={() => run(() => setSessionStatus(id, s))}
            className={`min-h-12 rounded-2xl border px-3 text-sm font-bold transition-colors ${
              status === s
                ? s === 'active'
                  ? 'border-lime bg-lime text-night-ink'
                  : 'border-tonic bg-tonic text-night-ink'
                : 'border-line bg-surface text-cream'
            }`}
          >
            {SESSION_STATUS_LABEL[s]}
          </button>
        ))}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setVotingOpen(id, !votingOpen))}
        className="btn btn-secondary w-full sm:w-auto"
      >
        {votingOpen ? 'Fermer les votes' : 'Rouvrir les votes'}
      </button>
      <p className="text-sm text-muted">
        {status === 'active'
          ? votingOpen
            ? 'Le public peut voter en ce moment.'
            : 'Session active, votes fermés.'
          : status === 'programmee'
            ? 'Annoncée. Le public pourra voter quand tu la passeras à « Active ».'
            : status === 'brouillon'
              ? 'Invisible pour le public.'
              : 'Terminée : le public voit un mot de remerciement.'}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export type PickerSong = { id: string; title: string; artist: string; status: SongStatus }

/** Sélection des tunes proposées au public. Seules les tunes maîtrisées sont proposables. */
export function SessionSongsPicker({
  sessionId,
  mastered,
  selectedIds,
  stale,
  playlists,
  playlistId,
}: {
  sessionId: string
  mastered: PickerSong[]
  selectedIds: string[]
  /** Tunes sélectionnées qui ne sont plus maîtrisées : gardées, mais masquées au public. */
  stale: PickerSong[]
  playlists: { id: string; name: string }[]
  playlistId: string | null
}) {
  const router = useRouter()
  const [selected, setSelected] = useState(() => new Set(selectedIds))
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState<ActionResult | null>(null)
  const [pending, startTransition] = useTransition()

  const visible = useMemo(() => {
    const words = normalize(query).split(' ').filter(Boolean)
    return mastered.filter((s) => {
      const hay = normalize(`${s.title} ${s.artist}`)
      return words.every((w) => hay.includes(w))
    })
  }, [mastered, query])

  const toggle = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
    setMessage(null)
  }

  const save = (ids: string[]) =>
    startTransition(async () => {
      const res = await setSessionSongs(sessionId, ids)
      setMessage(res)
      if (res.ok) router.refresh()
    })

  const dirty =
    selected.size !== selectedIds.length || selectedIds.some((id) => !selected.has(id))
  const masteredSelected = mastered.filter((s) => selected.has(s.id)).length

  return (
    <div className="space-y-4">
      {playlists.length > 0 ? (
        <div>
          <label className="label" htmlFor="session-playlist">
            Playlist associée (reprend ses tunes maîtrisées)
          </label>
          <select
            id="session-playlist"
            className="field"
            value={playlistId ?? ''}
            disabled={pending}
            onChange={(e) =>
              startTransition(async () => {
                const res = await applySessionPlaylist(sessionId, e.target.value || null)
                setMessage(res)
                if (res.ok) router.refresh()
              })
            }
          >
            <option value="">Aucune</option>
            {playlists.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={pending || mastered.length === 0}
          onClick={() => setSelected(new Set([...selected, ...mastered.map((s) => s.id)]))}
        >
          Tout le répertoire maîtrisé
        </button>
        <button type="button" className="btn btn-secondary btn-sm" disabled={pending} onClick={() => setSelected(new Set())}>
          Tout décocher
        </button>
      </div>

      {mastered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
          Aucune tune « Maîtrisé » dans le catalogue pour l’instant : le public n’aura rien à voter.
        </p>
      ) : (
        <>
          {mastered.length > 8 ? (
            <div className="relative">
              <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Chercher une tune"
                aria-label="Chercher une tune maîtrisée"
                className="field pl-10"
              />
            </div>
          ) : null}
          <ul className="max-h-[26rem] space-y-1 overflow-y-auto pr-1">
            {visible.map((song) => (
              <li key={song.id}>
                <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl px-2 hover:bg-surface">
                  <input
                    type="checkbox"
                    checked={selected.has(song.id)}
                    onChange={() => toggle(song.id)}
                    className="size-5 shrink-0 accent-[var(--jt-tonic)]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{song.title}</span>
                    <span className="block truncate text-xs text-muted">{song.artist}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </>
      )}

      {stale.length > 0 ? (
        <div className="rounded-2xl border border-danger/40 p-3 text-sm">
          <p className="font-bold text-danger">Plus proposées au public (statut changé ou tune archivée) :</p>
          <ul className="mt-2 space-y-1">
            {stale.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <span className="truncate">
                  {s.title} — {s.artist}
                </span>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending || !dirty}
          onClick={() => save([...selected])}
        >
          Enregistrer la sélection ({masteredSelected})
        </button>
        <FormMessage state={message} />
      </div>
    </div>
  )
}

export type RankingRow = {
  song_id: string
  title: string
  artist: string
  status: SongStatus
  in_selection: boolean
  votes: number
  recent: number
  rank: number
}

/** Classement de la session. Actualisation manuelle, et automatique pendant le concert. */
export function Ranking({
  rows,
  live,
  updatedAt,
}: {
  rows: RankingRow[]
  live: boolean
  updatedAt: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (!live) return
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, 20000)
    return () => clearInterval(timer)
  }, [live, router])

  const top = Math.max(1, ...rows.map((r) => r.votes))
  const total = rows.reduce((s, r) => s + r.votes, 0)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted">
          {total} vote{total > 1 ? 's' : ''} · mis à jour à {updatedAt}
          {live ? ' · actualisation automatique' : ''}
        </p>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={pending}
          onClick={() => startTransition(() => router.refresh())}
        >
          <RefreshCw size={16} className={pending ? 'animate-spin' : ''} aria-hidden /> Actualiser
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
          Aucune tune dans la sélection.
        </p>
      ) : (
        <ol className="space-y-2">
          {rows.map((row) => (
            <li
              key={row.song_id}
              data-testid="ranking-row"
              className="relative overflow-hidden rounded-2xl border border-line bg-surface"
            >
              <div
                aria-hidden
                className="absolute inset-y-0 left-0 bg-tonic/15"
                style={{ width: `${(row.votes / top) * 100}%` }}
              />
              <div className="relative flex items-center gap-3 p-3">
                <span className={`display w-8 text-center text-2xl ${row.votes > 0 && row.rank <= 3 ? 'text-tonic' : 'text-muted'}`}>
                  {row.votes > 0 ? row.rank : '–'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{row.title}</p>
                  <p className="truncate text-sm text-muted">
                    {row.artist}
                    {!row.in_selection || row.status !== 'maitrise' ? ' · plus proposée' : ''}
                  </p>
                </div>
                {row.recent > 0 ? (
                  <span className="chip border-lime/50 text-lime" title="Votes des 10 dernières minutes">
                    <TrendingUp size={14} aria-hidden /> +{row.recent}
                  </span>
                ) : null}
                <span className="display min-w-10 text-right text-3xl">{row.votes}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
