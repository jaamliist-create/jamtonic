import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, PageHeader } from '@/components/espace/page-header'
import { PlaylistForm } from '@/components/espace/playlist-forms'
import { formatTotalDuration } from '@/lib/domain/format'
import { requireMember } from '@/lib/security/member'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Playlists' }

export default async function PlaylistsPage({
  searchParams,
}: {
  searchParams: Promise<{ archives?: string }>
}) {
  await requireMember()
  const showArchived = (await searchParams).archives === '1'
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('playlists')
    .select('id, name, description, archived_at, updated_at, playlist_songs(songs(duration_seconds))')
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)

  const playlists = data.filter((p) => Boolean(p.archived_at) === showArchived)
  const archivedCount = data.filter((p) => p.archived_at).length

  return (
    <>
      <PageHeader
        title="Playlists"
        intro="Des collections libres : un concert, une répétition, un set acoustique. N’importe quelle tune peut y entrer."
      />
      {showArchived ? null : (
        <div className="card mb-6 p-4">
          <h2 className="display mb-3 text-2xl">Nouvelle playlist</h2>
          <PlaylistForm />
        </div>
      )}

      {playlists.length === 0 ? (
        <EmptyState title={showArchived ? 'Aucune playlist archivée' : 'Aucune playlist'}>
          {showArchived ? '' : 'Crée la première juste au-dessus.'}
        </EmptyState>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {playlists.map((p) => {
            const total = p.playlist_songs.reduce((s, r) => s + (r.songs?.duration_seconds ?? 0), 0)
            return (
              <li key={p.id}>
                <Link href={`/espace/playlists/${p.id}`} className="card block p-4 transition-colors hover:border-tonic/60">
                  <p className="display text-2xl">{p.name}</p>
                  {p.description ? <p className="mt-1 line-clamp-2 text-sm text-muted">{p.description}</p> : null}
                  <p className="mt-3 text-sm text-muted">
                    {p.playlist_songs.length} tune{p.playlist_songs.length > 1 ? 's' : ''}
                    {total > 0 ? ` · ${formatTotalDuration(total)}` : ''}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-6 text-sm">
        {showArchived ? (
          <Link href="/espace/playlists" className="text-muted underline underline-offset-4">
            Retour aux playlists actives
          </Link>
        ) : archivedCount > 0 ? (
          <Link href="/espace/playlists?archives=1" className="text-muted underline underline-offset-4">
            Voir les playlists archivées ({archivedCount})
          </Link>
        ) : null}
      </p>
    </>
  )
}
