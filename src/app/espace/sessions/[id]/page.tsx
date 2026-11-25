import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { ArrowLeft, Printer } from 'lucide-react'
import {
  Ranking,
  SessionControls,
  SessionForm,
  SessionSongsPicker,
  type PickerSong,
  type RankingRow,
} from '@/components/espace/session-forms'
import { deleteDraftSession } from '@/lib/actions/sessions'
import { env } from '@/lib/env'
import { formatDay, formatTime } from '@/lib/domain/format'
import { uuidSchema } from '@/lib/domain/schemas'
import { requireMember } from '@/lib/security/member'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Session' }

export default async function SessionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember()
  const { id } = await params
  if (!uuidSchema.safeParse(id).success) notFound()

  const supabase = await createClient()
  const [{ data: session }, { data: selection }, { data: mastered }, { data: playlists }, ranking] =
    await Promise.all([
      supabase.from('concert_sessions').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('session_songs')
        .select('song_id, songs(id, title, artist, status, archived_at)')
        .eq('session_id', id),
      supabase
        .from('songs')
        .select('id, title, artist, status')
        .eq('status', 'maitrise')
        .is('archived_at', null)
        .order('title'),
      supabase.from('playlists').select('id, name').is('archived_at', null).order('name'),
      supabase.rpc('session_ranking', { p_session: id }),
    ])
  if (!session) notFound()
  if (ranking.error) throw new Error(ranking.error.message)

  const publicUrl = `${env.siteUrl}/s/${session.slug}`
  const qrSvg = await QRCode.toString(publicUrl, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#021A24', light: '#FFFFFF' },
  })

  const stale: PickerSong[] = (selection ?? []).flatMap((r) =>
    r.songs && (r.songs.status !== 'maitrise' || r.songs.archived_at)
      ? [{ id: r.songs.id, title: r.songs.title, artist: r.songs.artist, status: r.songs.status }]
      : [],
  )
  const selectedIds = (selection ?? []).map((r) => r.song_id)
  const updatedAt = new Intl.DateTimeFormat('fr-CA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: 'America/Toronto',
  }).format(new Date())

  return (
    <>
      <Link href="/espace/sessions" className="btn btn-ghost -ml-3 mb-2">
        <ArrowLeft size={18} aria-hidden /> Sessions
      </Link>
      <header className="mb-6">
        <h1 className="display text-4xl md:text-5xl">{session.name}</h1>
        <p className="mt-1 text-muted">
          {formatDay(session.starts_on)}
          {session.starts_at ? ` · ${formatTime(session.starts_at)}` : ''}
          {session.venue ? ` · ${session.venue}` : ''}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="etat">
            <h2 id="etat" className="display mb-4 text-2xl">
              État de la soirée
            </h2>
            <SessionControls id={session.id} status={session.status} votingOpen={session.voting_open} />
          </section>

          <section className="card p-5" aria-labelledby="classement">
            <h2 id="classement" className="display mb-4 text-2xl">
              Classement
            </h2>
            <Ranking
              rows={(ranking.data ?? []) as RankingRow[]}
              live={session.status === 'active'}
              updatedAt={updatedAt}
            />
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-5" aria-labelledby="qr">
            <h2 id="qr" className="display mb-4 text-2xl">
              QR code
            </h2>
            <div className="flex flex-wrap items-center gap-4">
              <div
                data-testid="session-qr"
                role="img"
                aria-label={`QR code vers ${publicUrl}`}
                className="size-36 shrink-0 overflow-hidden rounded-2xl bg-white p-2 [&>svg]:size-full"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <div className="min-w-0 flex-1 space-y-3">
                <p className="break-all text-sm text-muted">{publicUrl}</p>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/espace/sessions/${session.id}/affiche`} className="btn btn-primary btn-sm">
                    <Printer size={16} aria-hidden /> Affiche à imprimer
                  </Link>
                  <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">
                    Voir la page ↗
                  </a>
                </div>
                {session.status === 'brouillon' ? (
                  <p className="text-xs text-danger">En brouillon, cette page est introuvable pour le public.</p>
                ) : null}
              </div>
            </div>
          </section>

          <section className="card p-5" aria-labelledby="tunes">
            <h2 id="tunes" className="display mb-4 text-2xl">
              Tunes proposées au vote
            </h2>
            <SessionSongsPicker
              key={`${selectedIds.join()}-${session.playlist_id}`}
              sessionId={session.id}
              mastered={mastered ?? []}
              selectedIds={selectedIds}
              stale={stale}
              playlists={playlists ?? []}
              playlistId={session.playlist_id}
            />
          </section>

          <section className="card p-5" aria-labelledby="reglages">
            <h2 id="reglages" className="display mb-4 text-2xl">
              Réglages
            </h2>
            <SessionForm
              key={session.updated_at}
              session={{
                id: session.id,
                name: session.name,
                venue: session.venue ?? '',
                starts_on: session.starts_on,
                starts_at: session.starts_at?.slice(0, 5) ?? '',
                listed: session.listed,
                voting_open: session.voting_open,
                max_votes: session.max_votes_per_participant,
              }}
            />
            {session.status === 'brouillon' ? (
              <form action={deleteDraftSession.bind(null, session.id)} className="mt-5 border-t border-line pt-4">
                <button type="submit" className="btn btn-danger btn-sm">
                  Supprimer ce brouillon
                </button>
              </form>
            ) : null}
          </section>
        </div>
      </div>
    </>
  )
}
