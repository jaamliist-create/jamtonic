import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { PlaylistEditor, type PlaylistSong } from '@/components/espace/playlist-editor'
import { PlaylistActions, PlaylistForm } from '@/components/espace/playlist-forms'
import { uuidSchema } from '@/lib/domain/schemas'
import { requireMember } from '@/lib/security/member'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Playlist' }

export default async function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember()
  const { id } = await params
  if (!uuidSchema.safeParse(id).success) notFound()

  const supabase = await createClient()
  const [{ data: playlist }, { data: rows }, { data: catalogue }] = await Promise.all([
    supabase.from('playlists').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('playlist_songs')
      .select('position, songs(id, title, artist, status, duration_seconds)')
      .eq('playlist_id', id)
      .order('position'),
    supabase
      .from('songs')
      .select('id, title, artist, status, duration_seconds')
      .is('archived_at', null)
      .order('title'),
  ])
  if (!playlist) notFound()

  const items: PlaylistSong[] = (rows ?? []).flatMap((r) => (r.songs ? [r.songs] : []))

  return (
    <>
      <Link href="/espace/playlists" className="btn btn-ghost -ml-3 mb-2">
        <ArrowLeft size={18} aria-hidden /> Playlists
      </Link>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-4xl md:text-5xl">{playlist.name}</h1>
          {playlist.archived_at ? <p className="chip mt-2 border-danger/50 text-danger">Archivée</p> : null}
        </div>
        <PlaylistActions id={playlist.id} name={playlist.name} archived={Boolean(playlist.archived_at)} />
      </header>

      <div className="card mb-6 p-4">
        <PlaylistForm
          key={playlist.updated_at}
          playlist={{ id: playlist.id, name: playlist.name, description: playlist.description }}
        />
      </div>

      <PlaylistEditor
        key={items.map((s) => s.id + s.status).join()}
        playlistId={playlist.id}
        initial={items}
        catalogue={catalogue ?? []}
      />
    </>
  )
}
