import type { Metadata } from 'next'
import { Bars, StatTile } from '@/components/espace/bars'
import { PageHeader } from '@/components/espace/page-header'
import { listDiscover } from '@/lib/data/catalogue'
import { formatDay } from '@/lib/domain/format'
import { SONG_STATUSES, SONG_STATUS_LABEL } from '@/lib/domain/types'
import { requireMember } from '@/lib/security/member'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Statistiques' }

const monthFmt = new Intl.DateTimeFormat('fr-CA', { month: 'long', year: 'numeric', timeZone: 'UTC' })

export default async function StatsPage() {
  const member = await requireMember()
  const supabase = await createClient()
  const since = new Date(Date.now() - 30 * 86400000).toISOString()

  const [songs, discover, activity, sessions, requested, suggestions, mastered] = await Promise.all([
    supabase.from('songs').select('status').is('archived_at', null),
    listDiscover(member.userId),
    supabase.from('activity_log').select('id', { count: 'exact', head: true }).gte('created_at', since),
    supabase.rpc('stats_sessions'),
    supabase.rpc('stats_top_requested', { p_limit: 15 }),
    supabase.rpc('stats_top_suggestions', { p_limit: 15 }),
    supabase.rpc('stats_mastered_by_month'),
  ])
  for (const r of [songs, sessions, requested, suggestions, mastered]) {
    if (r.error) throw new Error(r.error.message)
  }

  const byStatus = SONG_STATUSES.map((s) => ({
    key: s,
    label: SONG_STATUS_LABEL[s],
    value: (songs.data ?? []).filter((x) => x.status === s).length,
  }))
  const total = byStatus.reduce((s, r) => s + r.value, 0)
  const sessionRows = sessions.data ?? []
  const totalVotes = sessionRows.reduce((s, r) => s + r.votes, 0)

  return (
    <>
      <PageHeader title="Statistiques" intro="Des chiffres agrégés seulement : aucune donnée personnelle sur le public." />

      <h2 className="display mb-3 text-3xl text-tonic">Le band</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="tunes au catalogue" value={total} />
        <StatTile label="maîtrisées" value={byStatus.find((b) => b.key === 'maitrise')?.value ?? 0} tone="text-lime" />
        <StatTile label="modifications en 30 jours" value={activity.count ?? 0} />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5">
          <h3 className="display mb-4 text-2xl">Tunes par statut</h3>
          <Bars rows={byStatus} empty="Le catalogue est vide." />
        </section>
        <section className="card p-5">
          <h3 className="display mb-4 text-2xl">Progression du répertoire</h3>
          <Bars
            rows={(mastered.data ?? []).map((m) => ({
              key: m.month,
              label: monthFmt.format(new Date(`${m.month}T00:00:00Z`)),
              sub: 'tunes passées à Maîtrisé',
              value: m.mastered,
            }))}
            empty="Aucune tune n’est encore passée à « Maîtrisé »."
          />
        </section>
        <section className="card p-5 md:col-span-2">
          <h3 className="display mb-4 text-2xl">Propositions les plus votées</h3>
          <Bars
            rows={discover
              .filter((d) => d.votes > 0)
              .slice(0, 10)
              .map((d) => ({ key: d.id, label: d.title, sub: d.artist, value: d.votes }))}
            empty="Aucun vote interne pour l’instant."
          />
        </section>
      </div>

      <h2 className="display mb-3 mt-10 text-3xl text-tonic">Le public</h2>
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="concerts avec votes" value={sessionRows.filter((s) => s.votes > 0).length} />
        <StatTile label="votes au total" value={totalVotes} />
        <StatTile
          label="suggestions reçues"
          value={(suggestions.data ?? []).reduce((s, r) => s + r.requests, 0)}
        />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5 md:col-span-2">
          <h3 className="display mb-4 text-2xl">Comparaison entre concerts</h3>
          {sessionRows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-4 text-sm text-muted">
              Aucun concert pour l’instant.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="pb-2 font-semibold">Concert</th>
                    <th className="pb-2 text-right font-semibold">Votes</th>
                    <th className="pb-2 text-right font-semibold">Participants</th>
                    <th className="pb-2 text-right font-semibold">Tunes votées</th>
                    <th className="pb-2 text-right font-semibold">Suggestions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionRows.map((s) => (
                    <tr key={s.session_id} className="border-t border-line">
                      <td className="py-2.5">
                        <a href={`/espace/sessions/${s.session_id}`} className="font-bold underline-offset-4 hover:underline">
                          {s.name}
                        </a>
                        <span className="block text-xs text-muted">{formatDay(s.starts_on, true)}</span>
                      </td>
                      <td className="display py-2.5 text-right text-xl">{s.votes}</td>
                      <td className="py-2.5 text-right">{s.participants}</td>
                      <td className="py-2.5 text-right">{s.songs_voted}</td>
                      <td className="py-2.5 text-right">{s.suggestions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="card p-5">
          <h3 className="display mb-4 text-2xl">Tunes les plus demandées</h3>
          <Bars
            rows={(requested.data ?? []).map((r) => ({
              key: r.song_id,
              label: r.title,
              sub: `${r.artist} · ${r.sessions} concert${r.sessions > 1 ? 's' : ''}`,
              value: r.votes,
            }))}
            empty="Aucun vote du public pour l’instant."
          />
        </section>
        <section className="card p-5">
          <h3 className="display mb-4 text-2xl">Suggestions les plus fréquentes</h3>
          <Bars
            rows={(suggestions.data ?? []).map((r) => ({
              key: `${r.title}|${r.artist}`,
              label: r.title,
              sub: r.artist,
              value: r.requests,
            }))}
            empty="Aucune suggestion du public pour l’instant."
          />
        </section>
      </div>
    </>
  )
}
