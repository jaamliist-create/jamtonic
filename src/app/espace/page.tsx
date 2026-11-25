import type { Metadata } from 'next'
import Link from 'next/link'
import { StatTile } from '@/components/espace/bars'
import { EmptyState, PageHeader } from '@/components/espace/page-header'
import { listActivity, listDiscover } from '@/lib/data/catalogue'
import { describeActivity } from '@/lib/domain/activity'
import { formatDay, formatStamp, formatTime, todayIso } from '@/lib/domain/format'
import { SESSION_STATUS_LABEL } from '@/lib/domain/types'
import { requireMember } from '@/lib/security/member'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Tableau de bord' }

export default async function DashboardPage() {
  const member = await requireMember()
  const supabase = await createClient()

  const [songs, discover, activity, nextSession] = await Promise.all([
    supabase.from('songs').select('status').is('archived_at', null),
    listDiscover(member.userId),
    listActivity(8),
    supabase
      .from('concert_sessions')
      .select('id, name, venue, starts_on, starts_at, status')
      .in('status', ['programmee', 'active'])
      .gte('starts_on', todayIso())
      .order('starts_on')
      .limit(1)
      .maybeSingle(),
  ])
  if (songs.error) throw new Error(songs.error.message)

  const count = (status: string) => songs.data.filter((s) => s.status === status).length
  const total = songs.data.length
  const top = discover.filter((d) => d.votes > 0).slice(0, 5)

  return (
    <>
      <PageHeader title={`Salut ${member.profile.display_name} !`} intro="Où en est le band aujourd’hui." />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="tunes au catalogue" value={total} href="/espace/catalogue" />
        <StatTile label="maîtrisées" value={count('maitrise')} href="/espace/catalogue?statut=maitrise" tone="text-lime" />
        <StatTile label="à apprendre" value={count('a_apprendre')} href="/espace/a-apprendre" tone="text-tonic" />
        <StatTile label="à réviser" value={count('a_reviser')} href="/espace/catalogue?statut=a_reviser" tone="text-danger" />
      </div>

      {total === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="Le catalogue est vide"
            action={
              <Link href="/espace/catalogue/nouveau" className="btn btn-primary">
                Ajouter une première tune
              </Link>
            }
          >
            Ajoute les tunes une à une, ou importe le Google Sheets avec le script d’import (voir le README).
          </EmptyState>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section className="card p-5" aria-labelledby="prochaine">
          <h2 id="prochaine" className="display mb-3 text-2xl">
            Prochaine session
          </h2>
          {nextSession.data ? (
            <Link href={`/espace/sessions/${nextSession.data.id}`} className="block">
              <p className="text-lg font-bold">{nextSession.data.name}</p>
              <p className="text-sm text-muted">
                {formatDay(nextSession.data.starts_on)}
                {nextSession.data.starts_at ? ` · ${formatTime(nextSession.data.starts_at)}` : ''}
                {nextSession.data.venue ? ` · ${nextSession.data.venue}` : ''}
              </p>
              <span className="chip mt-3">{SESSION_STATUS_LABEL[nextSession.data.status]}</span>
            </Link>
          ) : (
            <>
              <p className="text-sm text-muted">Aucune session programmée.</p>
              <Link href="/espace/sessions" className="btn btn-secondary btn-sm mt-3">
                Préparer une session
              </Link>
            </>
          )}
        </section>

        <section className="card p-5" aria-labelledby="top">
          <h2 id="top" className="display mb-3 text-2xl">
            Propositions les plus votées
          </h2>
          {top.length === 0 ? (
            <>
              <p className="text-sm text-muted">
                {discover.length === 0 ? 'Aucune proposition en cours.' : 'Des propositions attendent tes votes.'}
              </p>
              <Link href="/espace/a-decouvrir" className="btn btn-secondary btn-sm mt-3">
                Aller voir « À découvrir »
              </Link>
            </>
          ) : (
            <ol className="space-y-2">
              {top.map((d) => (
                <li key={d.id} className="flex items-center gap-3">
                  <span className="display w-8 text-2xl text-tonic">{d.votes}</span>
                  <Link href="/espace/a-decouvrir" className="min-w-0">
                    <span className="block truncate text-sm font-bold">{d.title}</span>
                    <span className="block truncate text-xs text-muted">{d.artist}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="card p-5 md:col-span-2" aria-labelledby="activite">
          <h2 id="activite" className="display mb-3 text-2xl">
            Activité récente
          </h2>
          {activity.length === 0 ? (
            <p className="text-sm text-muted">Rien encore. L’historique se remplira au fil des modifications.</p>
          ) : (
            <ul className="divide-y divide-line">
              {activity.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5 text-sm">
                  <span>
                    <strong>{a.profiles?.display_name ?? 'Quelqu’un'}</strong> {describeActivity(a)}
                  </span>
                  <span className="text-xs text-muted">{formatStamp(a.created_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  )
}
