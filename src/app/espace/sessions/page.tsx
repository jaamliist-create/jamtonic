import type { Metadata } from 'next'
import Link from 'next/link'
import { EmptyState, PageHeader } from '@/components/espace/page-header'
import { SessionForm } from '@/components/espace/session-forms'
import { formatDay, formatTime, todayIso } from '@/lib/domain/format'
import { SESSION_STATUS_LABEL, type SessionStatus } from '@/lib/domain/types'
import { requireMember } from '@/lib/security/member'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Sessions' }

const TONE: Record<SessionStatus, string> = {
  brouillon: 'text-muted',
  programmee: 'border-tonic/60 text-tonic',
  active: 'border-lime bg-lime text-night-ink',
  terminee: 'text-muted',
}

export default async function SessionsPage() {
  await requireMember()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('concert_sessions')
    .select('id, name, venue, starts_on, starts_at, status, session_songs(count)')
    .order('starts_on', { ascending: false })
  if (error) throw new Error(error.message)

  const current = data.filter((s) => s.status !== 'terminee').reverse()
  const past = data.filter((s) => s.status === 'terminee')

  const list = (items: typeof data) => (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map((s) => (
        <li key={s.id}>
          <Link href={`/espace/sessions/${s.id}`} className="card block p-4 transition-colors hover:border-tonic/60">
            <div className="flex items-start justify-between gap-3">
              <p className="display text-2xl">{s.name}</p>
              <span className={`chip ${TONE[s.status]}`}>{SESSION_STATUS_LABEL[s.status]}</span>
            </div>
            <p className="mt-1 text-sm text-muted">
              {formatDay(s.starts_on)}
              {s.starts_at ? ` · ${formatTime(s.starts_at)}` : ''}
              {s.venue ? ` · ${s.venue}` : ''}
            </p>
            <p className="mt-2 text-sm text-muted">{s.session_songs[0]?.count ?? 0} tune(s) dans la sélection</p>
          </Link>
        </li>
      ))}
    </ul>
  )

  return (
    <>
      <PageHeader
        title="Sessions"
        intro="Un concert, un QR code, un classement. Les votes d’une session ne se mélangent jamais à ceux d’une autre."
      />
      <details className="card mb-6 p-4" open={data.length === 0}>
        <summary className="display min-h-11 cursor-pointer text-2xl leading-[2.75rem]">Nouvelle session</summary>
        <div className="mt-3">
          <SessionForm
            session={{
              name: '',
              venue: '',
              starts_on: todayIso(),
              starts_at: '',
              listed: true,
              voting_open: true,
              max_votes: 5,
            }}
          />
        </div>
      </details>

      {data.length === 0 ? (
        <EmptyState title="Aucune session">Crée ta première session pour obtenir son QR code.</EmptyState>
      ) : (
        <>
          {current.length > 0 ? <section className="mb-8">{list(current)}</section> : null}
          {past.length > 0 ? (
            <section>
              <h2 className="display mb-3 text-2xl text-muted">Terminées</h2>
              {list(past)}
            </section>
          ) : null}
        </>
      )}
    </>
  )
}
