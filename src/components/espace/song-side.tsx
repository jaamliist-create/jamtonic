'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Copy } from 'lucide-react'
import { saveMemberNote, setSongArchived } from '@/lib/actions/songs'
import { addSongToPlaylist } from '@/lib/actions/playlists'
import { FormMessage, SubmitButton, useActionForm } from '@/components/ui/form'

/** Notes personnelles : visibles par leur auteur seulement. */
export function MemberNoteForm({ songId, body }: { songId: string; body: string }) {
  const { state, onSubmit, pending } = useActionForm(saveMemberNote, null)
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="song_id" value={songId} />
      <label className="label" htmlFor="my-note">
        Mes accords, mes réglages, mes repères
      </label>
      <textarea id="my-note" name="body" defaultValue={body} maxLength={20000} rows={8} className="field" />
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending} className="btn btn-secondary">Enregistrer mes notes</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

export function ArchiveButton({ songId, archived }: { songId: string; archived: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        className={archived ? 'btn btn-secondary' : 'btn btn-danger'}
        onClick={() =>
          startTransition(async () => {
            const res = await setSongArchived(songId, !archived)
            if (res.ok) router.refresh()
            else setError(res.error)
          })
        }
      >
        {archived ? 'Restaurer la tune' : 'Archiver la tune'}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function AddToPlaylist({
  songId,
  playlists,
}: {
  songId: string
  playlists: { id: string; name: string }[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  if (playlists.length === 0) return null
  return (
    <div>
      <label className="label" htmlFor="add-to-playlist">
        Ajouter à une playlist
      </label>
      <select
        id="add-to-playlist"
        className="field"
        value=""
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value
          if (!id) return
          startTransition(async () => {
            const res = await addSongToPlaylist(id, songId)
            setMessage(res.ok ? 'Ajoutée.' : res.error)
            if (res.ok) router.refresh()
          })
        }}
      >
        <option value="">Choisir…</option>
        {playlists.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {message ? (
        <p role="status" className="mt-2 text-sm text-muted">
          {message}
        </p>
      ) : null}
    </div>
  )
}

/** Écrit dans le presse-papiers ; repli pour les contextes non sécurisés (téléphone sur le réseau local en http). */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const done = document.execCommand('copy')
    area.remove()
    return done
  }
}

/** Copie l'adresse d'un lien de la fiche, pour la coller ailleurs (message au band, autre appli). */
export function CopyLinkButton({ url, label }: { url: string; label: string }) {
  const [status, setStatus] = useState<'idle' | 'copied' | 'failed'>('idle')
  const copy = async () => {
    setStatus((await copyText(url)) ? 'copied' : 'failed')
    setTimeout(() => setStatus('idle'), 2000)
  }
  return (
    <button
      type="button"
      onClick={copy}
      data-testid="copy-link"
      aria-label={`Copier le lien ${label}`}
      className="btn btn-secondary btn-sm"
    >
      {status === 'copied' ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
      <span aria-live="polite">
        {status === 'copied' ? 'Copié' : status === 'failed' ? 'Copie impossible' : 'Copier'}
      </span>
    </button>
  )
}
