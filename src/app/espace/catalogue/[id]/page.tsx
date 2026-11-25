import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { SongForm } from '@/components/espace/song-form'
import { AddToPlaylist, ArchiveButton, CopyLinkButton, MemberNoteForm } from '@/components/espace/song-side'
import { getSong, listLabels } from '@/lib/data/catalogue'
import { formatStamp } from '@/lib/domain/format'
import { uuidSchema } from '@/lib/domain/schemas'
import { parseLinks } from '@/lib/domain/types'
import { requireMember } from '@/lib/security/member'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Fiche de tune' }

export default async function SongPage({ params }: { params: Promise<{ id: string }> }) {
  const member = await requireMember()
  const { id } = await params
  if (!uuidSchema.safeParse(id).success) notFound()

  const [detail, labels] = await Promise.all([getSong(id, member.userId), listLabels()])
  if (!detail) notFound()
  const { song } = detail

  const supabase = await createClient()
  const { data: allPlaylists } = await supabase
    .from('playlists')
    .select('id, name')
    .is('archived_at', null)
    .order('name')
  const inPlaylists = new Set(detail.playlists.map((p) => p.id))

  return (
    <>
      <Link href="/espace/catalogue" className="btn btn-ghost -ml-3 mb-2">
        <ArrowLeft size={18} aria-hidden /> Catalogue
      </Link>
      <header className="mb-6">
        <h1 className="display text-4xl md:text-5xl">{song.title}</h1>
        <p className="mt-1 text-lg text-muted">{song.artist}</p>
        {song.archived_at ? <p className="chip mt-3 border-danger/50 text-danger">Archivée</p> : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <section className="card p-5" aria-labelledby="fiche">
          <h2 id="fiche" className="display mb-4 text-2xl">
            La fiche
          </h2>
          <SongForm
            key={song.updated_at}
            song={{
              id: song.id,
              title: song.title,
              artist: song.artist,
              status: song.status,
              learning_priority: song.learning_priority,
              duration_seconds: song.duration_seconds,
              year: song.year,
              musical_key: song.musical_key,
              bpm: song.bpm,
              notes: song.notes,
              links: parseLinks(song.links),
              genres: detail.genres,
              tags: detail.tags,
            }}
            genreSuggestions={labels.genres}
            tagSuggestions={labels.tags}
          />
          {parseLinks(song.links).length > 0 ? (
            <ul className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              {parseLinks(song.links).map((l) => (
                <li key={l.url} className="flex gap-1">
                  <a href={l.url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    {l.label || 'Ouvrir le lien'} ↗
                  </a>
                  <CopyLinkButton url={l.url} label={l.label || l.url} />
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="mes-notes">
            <h2 id="mes-notes" className="display text-2xl">
              Mes notes
            </h2>
            <p className="mb-4 mt-1 text-xs text-muted">Toi seul peux les lire.</p>
            <MemberNoteForm songId={song.id} body={detail.myNote} />
          </section>

          <section className="card space-y-4 p-5" aria-labelledby="playlists">
            <h2 id="playlists" className="display text-2xl">
              Playlists
            </h2>
            {detail.playlists.length > 0 ? (
              <ul className="flex flex-wrap gap-2">
                {detail.playlists.map((p) => (
                  <li key={p.id}>
                    <Link href={`/espace/playlists/${p.id}`} className="chip min-h-11 px-4">
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">Dans aucune playlist pour l’instant.</p>
            )}
            <AddToPlaylist
              songId={song.id}
              playlists={(allPlaylists ?? []).filter((p) => !inPlaylists.has(p.id))}
            />
          </section>

          <section className="card space-y-3 p-5 text-sm text-muted">
            <p>
              Dernière modification : {formatStamp(song.updated_at)}
              {detail.editorName ? ` par ${detail.editorName}` : ''}
            </p>
            <p>Ajoutée le {formatStamp(song.created_at)}</p>
            <ArchiveButton songId={song.id} archived={Boolean(song.archived_at)} />
          </section>
        </div>
      </div>
    </>
  )
}
