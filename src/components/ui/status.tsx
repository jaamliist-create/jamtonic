'use client'

import { useState, useTransition } from 'react'
import { setSongPriority, setSongStatus } from '@/lib/actions/songs'
import {
  LEARNING_PRIORITIES,
  LEARNING_PRIORITY_LABEL,
  SONG_STATUSES,
  SONG_STATUS_LABEL,
  type LearningPriority,
  type SongStatus,
} from '@/lib/domain/types'

const TONE: Record<SongStatus, string> = {
  a_decouvrir: 'border-cream/30 text-cream',
  a_apprendre: 'border-tonic/60 text-tonic',
  en_cours: 'border-wood-glow text-[#f0b48f]',
  a_reviser: 'border-danger/60 text-danger',
  maitrise: 'border-lime/60 text-lime',
}

const PRIORITY_TONE: Record<LearningPriority, string> = {
  urgent: 'border-danger/70 text-danger',
  moyen_terme: 'border-tonic/60 text-tonic',
  pour_le_fun: 'border-lime/60 text-lime',
}

export function PriorityBadge({ priority }: { priority: LearningPriority | null }) {
  if (!priority) return null
  return (
    <span className={`chip bg-transparent ${PRIORITY_TONE[priority]}`}>
      {LEARNING_PRIORITY_LABEL[priority]}
    </span>
  )
}

/** Priorité d'apprentissage modifiable en un geste. Indépendante du statut. */
export function PrioritySelect({
  songId,
  priority,
}: {
  songId: string
  priority: LearningPriority | null
}) {
  const [value, setValue] = useState(priority)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <select
      data-testid="priority-select"
      aria-label="Priorité d’apprentissage"
      value={value ?? ''}
      disabled={pending}
      onChange={(e) => {
        const next = (e.target.value || null) as LearningPriority | null
        const previous = value
        setValue(next)
        setError(false)
        startTransition(async () => {
          const res = await setSongPriority(songId, next)
          if (!res.ok) {
            setValue(previous)
            setError(true)
          }
        })
      }}
      className={`min-h-11 cursor-pointer appearance-none rounded-full border bg-night-ink/60 px-3.5 text-center text-xs font-bold ${
        value ? PRIORITY_TONE[value] : 'border-line text-muted'
      } ${pending ? 'opacity-60' : ''} ${error ? 'ring-2 ring-danger' : ''}`}
    >
      <option value="" className="bg-night-ink text-cream">
        Sans priorité
      </option>
      {LEARNING_PRIORITIES.map((p) => (
        <option key={p} value={p} className="bg-night-ink text-cream">
          {LEARNING_PRIORITY_LABEL[p]}
        </option>
      ))}
    </select>
  )
}

export function StatusBadge({ status }: { status: SongStatus }) {
  return <span className={`chip bg-transparent ${TONE[status]}`}>{SONG_STATUS_LABEL[status]}</span>
}

/**
 * Pastille de statut modifiable : un tap, un choix. Toutes les transitions sont
 * permises, rien n'est automatique.
 */
export function StatusSelect({ songId, status }: { songId: string; status: SongStatus }) {
  const [value, setValue] = useState(status)
  const [error, setError] = useState(false)
  const [pending, startTransition] = useTransition()

  return (
    <select
      data-testid="status-select"
      aria-label="Statut de la tune"
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as SongStatus
        const previous = value
        setValue(next)
        setError(false)
        startTransition(async () => {
          const res = await setSongStatus(songId, next)
          if (!res.ok) {
            setValue(previous)
            setError(true)
          }
        })
      }}
      className={`min-h-11 cursor-pointer appearance-none rounded-full border bg-night-ink/60 px-3.5 text-center text-xs font-bold ${TONE[value]} ${
        pending ? 'opacity-60' : ''
      } ${error ? 'ring-2 ring-danger' : ''}`}
    >
      {SONG_STATUSES.map((s) => (
        <option key={s} value={s} className="bg-night-ink text-cream">
          {SONG_STATUS_LABEL[s]}
        </option>
      ))}
    </select>
  )
}
