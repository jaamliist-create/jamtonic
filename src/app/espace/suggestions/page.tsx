import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, PageHeader } from '@/components/espace/page-header'
import { SuggestionActions } from '@/components/espace/suggestion-actions'
import { StatusBadge } from '@/components/ui/status'
import { formatStamp } from '@/lib/domain/format'
import type { SongStatus, SuggestionStatus } from '@/lib/domain/types'
import { requireMember } from '@/lib/security/member'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Suggestions du public' }

const VIEWS: { key: SuggestionStatus; label: string }[] = [
  { key: 'nouvelle', label: 'À regarder' },
  { key: 'retenue', label: 'Retenues' },
  { key: 'ecartee', label: 'Écartées' },
]

type Group = {
  id: string
  title: string
  artist: string
  count: number
  last: string
  sessions: Set<string>
  songId: string | null
  songStatus: SongStatus | null
}

export default async function SuggestionsPage({
  searchParams,
}: {
  searchParams: Promise<{ vue?: string }>
}) {
  await requireMember()
  const { vue } = await searchParams
  const view = VIEWS.find((v) => v.key === vue)?.key ?? 'nouvelle'

  const supabase = await createClient()
  const [{ data, error }, { data: songs }] = await Promise.all([
    supabase
      .from('public_suggestions')
      .select('id, title, artist, title_norm, artist_norm, created_at, song_id, concert_sessions(name)')
      .eq('status', view)
      .order('created_at', { ascending: true })
      .limit(2000),
    supabase.from('songs').select('id, status, title_norm, artist_norm'),
  ])
  if (error) throw new Error(error.message)

  const songByNorm = new Map((songs ?? []).map((s) => [`${s.title_norm}|${s.artist_norm}`, s]))

  // Regroupe les demandes identiques : le band voit « 7 personnes veulent cette tune ».
  const groups = new Map<string, Group>()
  for (const s of data) {
    const key = `${s.title_norm}|${s.artist_norm}`
    const existing = groups.get(key)
    if (existing) {
      existing.count += 1
      existing.last = s.created_at
      if (s.concert_sessions) existing.sessions.add(s.concert_sessions.name)
    } else {
      const song = songByNorm.get(key) ?? null
      groups.set(key, {
        id: s.id,
        title: s.title,
        artist: s.artist,
        count: 1,
        last: s.created_at,
        sessions: new Set(s.concert_sessions ? [s.concert_sessions.name] : []),
        songId: song?.id ?? s.song_id,
        songStatus: song?.status ?? null,
      })
    }
  }
  const sorted = [...groups.values()].sort((a, b) => b.count - a.count || b.last.localeCompare(a.last))

  return (
    <>
      <PageHeader
        title="Suggestions du public"
        intro="Ce que la salle aimerait entendre. Rien n’entre au catalogue sans que l’un de nous le décide."
      />
      <nav aria-label="Filtrer les suggestions" className="mb-5 flex gap-2">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/espace/suggestions?vue=${v.key}`}
            aria-current={view === v.key ? 'page' : undefined}
            className={`flex min-h-11 items-center rounded-full border px-4 text-sm font-bold ${
              view === v.key ? 'border-tonic bg-tonic text-night-ink' : 'border-line bg-surface'
            }`}
          >
            {v.label}
          </Link>
        ))}
      </nav>

      {sorted.length === 0 ? (
        <EmptyState title={view === 'nouvelle' ? 'Rien de nouveau' : 'Rien ici'}>
          {view === 'nouvelle'
            ? 'Les propositions du public arriveront ici, depuis le site ou depuis la page d’une soirée.'
            : ''}
        </EmptyState>
      ) : (
        <ul className="space-y-3">
          {sorted.map((g) => (
            <li key={g.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{g.title}</p>
                  <p className="text-sm text-muted">{g.artist}</p>
                </div>
                <span className="chip border-tonic/50 text-tonic">
                  {g.count} demande{g.count > 1 ? 's' : ''}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">
                Dernière demande : {formatStamp(g.last)}
                {g.sessions.size > 0 ? ` · ${[...g.sessions].join(', ')}` : ''}
              </p>
              {g.songStatus ? (
                <p className="mt-2 flex items-center gap-2 text-xs text-muted">
                  Déjà au catalogue : <StatusBadge status={g.songStatus} />
                </p>
              ) : null}
              <SuggestionActions suggestionId={g.id} status={view} existingSongId={g.songId} />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
