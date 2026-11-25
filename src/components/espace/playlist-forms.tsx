'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { duplicatePlaylist, savePlaylist, setPlaylistArchived } from '@/lib/actions/playlists'
import { FormMessage, SubmitButton, useActionForm } from '@/components/ui/form'

export function PlaylistForm({
  playlist,
}: {
  playlist?: { id: string; name: string; description: string }
}) {
  const router = useRouter()
  const { state, onSubmit, pending } = useActionForm(savePlaylist, null)

  useEffect(() => {
    if (state?.ok && !playlist && state.id) router.push(`/espace/playlists/${state.id}`)
  }, [state, playlist, router])

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      {playlist ? <input type="hidden" name="id" value={playlist.id} /> : null}
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input
          name="name"
          required
          maxLength={80}
          defaultValue={playlist?.name}
          placeholder="Nom (ex. : Concert 45 minutes)"
          aria-label="Nom de la playlist"
          className="field"
        />
        <input
          name="description"
          maxLength={500}
          defaultValue={playlist?.description}
          placeholder="Description (facultatif)"
          aria-label="Description"
          className="field"
        />
        <SubmitButton pending={pending} className={playlist ? 'btn btn-secondary' : 'btn btn-primary'}>
          {playlist ? 'Enregistrer' : 'Créer'}
        </SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  )
}

export function PlaylistActions({
  id,
  name,
  archived,
}: {
  id: string
  name: string
  archived: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={pending}
        className="btn btn-secondary"
        onClick={() =>
          startTransition(async () => {
            const res = await duplicatePlaylist(id, `${name} (copie)`)
            if (res.ok && res.id) router.push(`/espace/playlists/${res.id}`)
            else if (!res.ok) setError(res.error)
          })
        }
      >
        Dupliquer
      </button>
      <button
        type="button"
        disabled={pending}
        className={archived ? 'btn btn-secondary' : 'btn btn-danger'}
        onClick={() =>
          startTransition(async () => {
            const res = await setPlaylistArchived(id, !archived)
            if (res.ok) router.refresh()
            else setError(res.error)
          })
        }
      >
        {archived ? 'Restaurer' : 'Archiver'}
      </button>
      {error ? (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
