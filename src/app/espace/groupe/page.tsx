import type { Metadata } from 'next'
import { InviteForm, MemberAccessButton, ProfileForm } from '@/components/espace/group-forms'
import { PageHeader } from '@/components/espace/page-header'
import { emailToLogin } from '@/lib/domain/login'
import { requireMember } from '@/lib/security/member'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Groupe' }

export default async function GroupPage() {
  const member = await requireMember()
  const isOwner = member.profile.is_owner
  const supabase = await createClient()

  // Les membres se voient entre eux (RLS). Les profils désactivés et les courriels
  // ne sont lus que pour le propriétaire technique, côté serveur.
  let members: {
    id: string
    display_name: string
    instrument: string | null
    is_owner: boolean
    is_active: boolean
    email?: string
    pending?: boolean
  }[]

  if (isOwner) {
    const admin = createAdminClient()
    const [{ data: profiles }, { data: users }] = await Promise.all([
      admin.from('profiles').select('id, display_name, instrument, is_owner, is_active').order('display_name'),
      admin.auth.admin.listUsers({ perPage: 200 }),
    ])
    const byId = new Map((users?.users ?? []).map((u) => [u.id, u]))
    members = (profiles ?? []).map((p) => ({
      ...p,
      email: byId.get(p.id)?.email,
      pending: !byId.get(p.id)?.last_sign_in_at,
    }))
  } else {
    const { data } = await supabase
      .from('profiles')
      .select('id, display_name, instrument, is_owner, is_active')
      .order('display_name')
    members = data ?? []
  }

  return (
    <>
      <PageHeader title="Groupe" intro="Les membres du band et ton profil." />

      <section className="card mb-6 p-5" aria-labelledby="profil">
        <h2 id="profil" className="display mb-4 text-2xl">
          Mon profil
        </h2>
        <ProfileForm displayName={member.profile.display_name} instrument={member.profile.instrument ?? ''} />
        <p className="mt-3 text-xs text-muted">Connecté avec {member.email ? emailToLogin(member.email) : null}</p>
      </section>

      <section className="card mb-6 p-5" aria-labelledby="membres">
        <h2 id="membres" className="display mb-4 text-2xl">
          Membres
        </h2>
        <ul className="divide-y divide-line">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="font-bold">
                  {m.display_name}
                  {m.id === member.userId ? <span className="font-normal text-muted"> (toi)</span> : null}
                </p>
                <p className="truncate text-sm text-muted">
                  {[m.instrument, m.email ? emailToLogin(m.email) : null].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
              {m.pending ? <span className="chip">Invitation en attente</span> : null}
              {!m.is_active ? <span className="chip border-danger/50 text-danger">Désactivé</span> : null}
              {isOwner && m.id !== member.userId ? <MemberAccessButton memberId={m.id} active={m.is_active} /> : null}
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-muted">
          Tous les membres ont les mêmes droits sur le catalogue, les playlists et les sessions.
        </p>
      </section>

      {isOwner ? (
        <section className="card p-5" aria-labelledby="inviter">
          <h2 id="inviter" className="display text-2xl">
            Inviter un membre
          </h2>
          <p className="mb-4 mt-1 text-sm text-muted">
            La personne reçoit un courriel pour choisir son mot de passe. Il n’existe aucune inscription publique.
          </p>
          <InviteForm />
        </section>
      ) : null}
    </>
  )
}
