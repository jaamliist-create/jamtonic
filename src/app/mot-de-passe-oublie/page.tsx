import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth-shell'
import { ResetForm } from '@/components/auth-forms'

export const metadata: Metadata = { title: 'Mot de passe oublié', robots: { index: false } }

export default function MotDePasseOubliePage() {
  return (
    <AuthShell title="Mot de passe oublié" intro="On t’envoie un lien pour en choisir un nouveau.">
      <ResetForm />
    </AuthShell>
  )
}
