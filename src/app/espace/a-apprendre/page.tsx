import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, PageHeader } from '@/components/espace/page-header'
import { PrioritySelect, StatusSelect } from '@/components/ui/status'
import { formatDuration, formatStamp } from '@/lib/domain/format'
import { LEARNING_PRIORITIES, parseLinks, type LearningPriority } from '@/lib/domain/types'
import { requireMember } from '@/lib/security/member'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'À apprendre' }

export default async function LearnPage() {
  await requireMember()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('songs')
    .select(
      'id, title, artist, status, learning_priority, duration_seconds, year, notes, links, updated_at, song_genres(genres(name)), editor:profiles!songs_updated_by_fkey(display_name)',
    )
    .in('status', ['a_apprendre', 'en_cours'])
    .is('archived_at', null)
    .order('title')
  if (error) throw new Error(error.message)

  // Les plus pressantes d'abord ; les tunes sans priorité à la fin.
  const weight = (p: LearningPriority | null) => (p ? LEARNING_PRIORITIES.indexOf(p) : LEARNING_PRIORITIES.length)
  const byPriority = (status: string) =>
    data
      .filter((s) => s.status === status)
      .sort((a, b) => weight(a.learning_priority) - weight(b.learning_priority) || a.title.localeCompare(b.title, 'fr'))

  const groups = [
    { title: 'En cours', songs: byPriority('en_cours') },
    { title: 'À apprendre', songs: byPriority('a_apprendre') },
  ]

  return (
    <>
      <PageHeader
        title="À apprendre"
        intro="Les tunes retenues pour être travaillées, les plus pressantes d’abord. La priorité dit ce qu’on veut apprendre en premier ; le statut dit où on en est."
        action={
          <Link href="/espace/catalogue?statut=a_reviser" className="btn btn-secondary">
            Voir les tunes à réviser
          </Link>
        }
      />
      {data.length === 0 ? (
        <EmptyState
          title="Rien sur le lutrin"
          action={
            <Link href="/espace/a-decouvrir" className="btn btn-primary">
              Aller voir « À découvrir »
            </Link>
          }
        >
          Passe une tune à « À apprendre » depuis les propositions ou depuis le catalogue.
        </EmptyState>
      ) : (
        groups.map((group) =>
          group.songs.length === 0 ? null : (
            <section key={group.title} className="mb-8">
              <h2 className="display mb-3 text-2xl text-tonic">
                {group.title} <span className="text-muted">· {group.songs.length}</span>
              </h2>
              <ul className="space-y-3">
                {group.songs.map((song) => {
                  const links = parseLinks(song.links)
                  const genres = song.song_genres.flatMap((g) => g.genres?.name ?? [])
                  return (
                    <li key={song.id} className="card p-4">
                      <div className="flex items-start gap-3">
                        <Link href={`/espace/catalogue/${song.id}`} className="min-w-0 flex-1">
                          <p className="font-bold">{song.title}</p>
                          <p className="text-sm text-muted">
                            {[
                              song.artist,
                              song.year,
                              formatDuration(song.duration_seconds),
                              genres.join(', '),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        </Link>
                        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
                          <PrioritySelect
                            key={song.learning_priority ?? 'aucune'}
                            songId={song.id}
                            priority={song.learning_priority}
                          />
                          <StatusSelect key={song.status} songId={song.id} status={song.status} />
                        </div>
                      </div>
                      {song.notes ? (
                        <p className="mt-3 line-clamp-4 whitespace-pre-line rounded-xl bg-night-ink/50 p-3 text-sm">
                          {song.notes}
                        </p>
                      ) : null}
                      {links.length > 0 ? (
                        <ul className="mt-3 flex flex-wrap gap-2">
                          {links.map((l) => (
                            <li key={l.url}>
                              <a
                                href={l.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-secondary btn-sm"
                              >
                                {l.label || 'Référence'} ↗
                              </a>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                      <p className="mt-3 text-xs text-muted">
                        Modifiée le {formatStamp(song.updated_at)}
                        {song.editor?.display_name ? ` par ${song.editor.display_name}` : ''}
                      </p>
                    </li>
                  )
                })}
              </ul>
            </section>
          ),
        )
      )}
    </>
  )
}
