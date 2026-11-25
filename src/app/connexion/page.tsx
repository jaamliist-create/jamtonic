import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AuthShell } from '@/components/auth-shell'
import { LoginForm } from '@/components/auth-forms'
import { getSessionContext } from '@/lib/security/member'

export const metadata: Metadata = { title: 'Connexion', robots: { index: false } }

export default async function ConnexionPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; erreur?: string }>
}) {
  const { next, erreur } = await searchParams
  const ctx = await getSessionContext()
  if (ctx?.profile) redirect('/espace')

  return (
    <AuthShell title="Espace du band" intro="Réservé aux musiciens de JamTonic.">
      {erreur === 'lien' ? (
        <p role="alert" className="mb-4 text-sm font-medium text-danger">
          Ce lien n’est plus valide. Demande-en un nouveau.
        </p>
      ) : null}
      <LoginForm next={next} />
    </AuthShell>
  )
}
