import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { EspaceNav } from '@/components/espace/nav'
import { signOut } from '@/lib/actions/auth'
import { getSessionContext } from '@/lib/security/member'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: { default: 'Espace du band', template: '%s · Espace JamTonic' },
  robots: { index: false, follow: false },
}

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/connexion')

  if (ctx.profile && ctx.mustChangePassword) redirect('/definir-mot-de-passe')

  // Compte connecté mais sans profil actif : aucune page, aucune donnée.
  if (!ctx.profile) {
    return (
      <main className="grid min-h-dvh place-items-center px-6 text-center">
        <div className="max-w-sm">
          <h1 className="display text-4xl">Ton accès n’est pas activé</h1>
          <p className="mt-3 text-muted">
            Ce compte ne fait pas partie des membres du band. Demande au propriétaire technique de
            vérifier ton invitation.
          </p>
          <form action={signOut} className="mt-8">
            <button type="submit" className="btn btn-secondary">
              Se déconnecter
            </button>
          </form>
        </div>
      </main>
    )
  }

  const supabase = await createClient()
  const { count } = await supabase
    .from('public_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'nouvelle')

  return (
    <div className="min-h-dvh bg-[radial-gradient(ellipse_at_top_right,var(--jt-night),var(--jt-night-deep)_60%)] bg-fixed">
      <EspaceNav memberName={ctx.profile.display_name} badge={count ?? 0} />
      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 md:px-6 lg:max-w-none lg:pb-12 lg:pl-72 lg:pr-8 lg:pt-8">
        <div className="lg:mx-auto lg:max-w-5xl">{children}</div>
      </main>
    </div>
  )
}
