'use client'

import { useEffect, useId, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, X } from 'lucide-react'
import { saveSong } from '@/lib/actions/songs'
import { FormMessage, SubmitButton, useActionForm } from '@/components/ui/form'
import { formatDuration } from '@/lib/domain/format'
import { normalize } from '@/lib/domain/normalize'
import {
  LEARNING_PRIORITIES,
  LEARNING_PRIORITY_LABEL,
  SONG_STATUSES,
  SONG_STATUS_LABEL,
  type LearningPriority,
  type SongLink,
  type SongStatus,
} from '@/lib/domain/types'

/** Saisie de genres ou d'étiquettes : Entrée ou virgule pour ajouter, suggestions existantes. */
function TokenInput({
  name,
  label,
  placeholder,
  initial,
  suggestions,
}: {
  name: string
  label: string
  placeholder: string
  initial: string[]
  suggestions: string[]
}) {
  const [values, setValues] = useState(initial)
  const [draft, setDraft] = useState('')
  const listId = useId()
  const inputId = useId()

  const add = (raw: string) => {
    const value = raw.replace(/\s+/g, ' ').trim().slice(0, 40)
    if (!value) return
    // Reprend l'orthographe existante si le libellé existe déjà.
    const known = suggestions.find((s) => normalize(s) === normalize(value)) ?? value
    setValues((v) => (v.some((x) => normalize(x) === normalize(known)) ? v : [...v, known]))
    setDraft('')
  }

  return (
    <div>
      <label className="label" htmlFor={inputId}>
        {label}
      </label>
      {values.length > 0 ? (
        <ul className="mb-2 flex flex-wrap gap-2">
          {values.map((v) => (
            <li key={v} className="chip py-0 pr-0">
              <input type="hidden" name={name} value={v} />
              {v}
              <button
                type="button"
                aria-label={`Retirer ${v}`}
                onClick={() => setValues(values.filter((x) => x !== v))}
                className="grid size-9 place-items-center rounded-full"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex gap-2">
        <input
          id={inputId}
          list={listId}
          value={draft}
          onChange={(e) => {
            const v = e.target.value
            if (v.endsWith(',')) add(v.slice(0, -1))
            else setDraft(v)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add(draft)
            }
          }}
          onBlur={() => add(draft)}
          placeholder={placeholder}
          className="field"
        />
        <button type="button" onClick={() => add(draft)} className="btn btn-secondary" aria-label={`Ajouter : ${label}`}>
          <Plus size={18} aria-hidden />
        </button>
      </div>
      <datalist id={listId}>
        {suggestions
          .filter((s) => !values.includes(s))
          .map((s) => (
            <option key={s} value={s} />
          ))}
      </datalist>
    </div>
  )
}

function LinksEditor({ initial }: { initial: SongLink[] }) {
  const [rows, setRows] = useState(() => initial.map((l, i) => ({ ...l, key: i })))
  const [nextKey, setNextKey] = useState(initial.length)

  return (
    <fieldset>
      <legend className="label">Liens de référence</legend>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex gap-2">
            <input
              name="link_label"
              defaultValue={row.label}
              placeholder="Nom (ex. : version live)"
              aria-label="Nom du lien"
              maxLength={60}
              className="field w-2/5"
            />
            <input
              name="link_url"
              type="url"
              defaultValue={row.url}
              placeholder="https://…"
              aria-label="Adresse du lien"
              maxLength={500}
              className="field flex-1"
            />
            <button
              type="button"
              aria-label="Retirer ce lien"
              onClick={() => setRows(rows.filter((r) => r.key !== row.key))}
              className="btn btn-ghost"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        ))}
      </div>
      {rows.length < 10 ? (
        <button
          type="button"
          onClick={() => {
            setRows([...rows, { label: '', url: '', key: nextKey }])
            setNextKey(nextKey + 1)
          }}
          className="btn btn-secondary btn-sm mt-2"
        >
          <Plus size={16} aria-hidden /> Ajouter un lien
        </button>
      ) : null}
    </fieldset>
  )
}

export type SongFormValues = {
  id?: string
  title: string
  artist: string
  status: SongStatus
  learning_priority: LearningPriority | null
  duration_seconds: number | null
  year: number | null
  musical_key: string | null
  bpm: number | null
  notes: string
  links: SongLink[]
  genres: string[]
  tags: string[]
}

export function SongForm({
  song,
  genreSuggestions,
  tagSuggestions,
}: {
  song: SongFormValues
  genreSuggestions: string[]
  tagSuggestions: string[]
}) {
  const router = useRouter()
  const { state, onSubmit, pending } = useActionForm(saveSong, null)

  // Après une création, on ouvre la fiche.
  useEffect(() => {
    if (state?.ok && !song.id && state.id) router.push(`/espace/catalogue/${state.id}`)
  }, [state, song.id, router])

  return (
    <form onSubmit={onSubmit} className="space-y-5" data-testid="song-form">
      {song.id ? <input type="hidden" name="id" value={song.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="title">
            Titre
          </label>
          <input id="title" name="title" defaultValue={song.title} required maxLength={200} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="artist">
            Artiste
          </label>
          <input id="artist" name="artist" defaultValue={song.artist} required maxLength={200} className="field" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <div>
          <label className="label" htmlFor="status">
            Statut
          </label>
          <select id="status" name="status" defaultValue={song.status} className="field">
            {SONG_STATUSES.map((s) => (
              <option key={s} value={s}>
                {SONG_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="learning_priority">
            Priorité
          </label>
          <select
            id="learning_priority"
            name="learning_priority"
            defaultValue={song.learning_priority ?? ''}
            className="field"
          >
            <option value="">Aucune</option>
            {LEARNING_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {LEARNING_PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="duration">
            Durée
          </label>
          <input
            id="duration"
            name="duration"
            defaultValue={formatDuration(song.duration_seconds)}
            placeholder="3:45"
            inputMode="numeric"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="year">
            Année
          </label>
          <input
            id="year"
            name="year"
            defaultValue={song.year ?? ''}
            placeholder="1987"
            inputMode="numeric"
            maxLength={4}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="musical_key">
            Tonalité
          </label>
          <input
            id="musical_key"
            name="musical_key"
            defaultValue={song.musical_key ?? ''}
            placeholder="La m"
            maxLength={20}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor="bpm">
            BPM
          </label>
          <input
            id="bpm"
            name="bpm"
            defaultValue={song.bpm ?? ''}
            placeholder="120"
            inputMode="numeric"
            maxLength={3}
            className="field"
          />
        </div>
      </div>

      <TokenInput
        name="genres"
        label="Genres"
        placeholder="Rock, Pop, Blues…"
        initial={song.genres}
        suggestions={genreSuggestions}
      />
      <TokenInput
        name="tags"
        label="Étiquettes"
        placeholder="Énergique, Final, Années 80…"
        initial={song.tags}
        suggestions={tagSuggestions}
      />

      <div>
        <label className="label" htmlFor="notes">
          Notes du groupe — structure, intro, break, fin, tonalité
        </label>
        <textarea id="notes" name="notes" defaultValue={song.notes} maxLength={20000} rows={6} className="field" />
      </div>

      <LinksEditor initial={song.links} />

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending}>{song.id ? 'Enregistrer' : 'Ajouter la tune'}</SubmitButton>
        <FormMessage state={state}>
          {state && !state.ok && state.existingId ? (
            <Link href={`/espace/catalogue/${state.existingId}`} className="underline underline-offset-4">
              Voir la tune
            </Link>
          ) : null}
        </FormMessage>
      </div>
    </form>
  )
}
