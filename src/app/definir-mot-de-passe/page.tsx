import type { Metadata } from 'next'
import { AuthShell } from '@/components/auth-shell'
import { PasswordForm } from '@/components/auth-forms'

export const metadata: Metadata = { title: 'Choisir un mot de passe', robots: { index: false } }

export default function DefinirMotDePassePage() {
  return (
    <AuthShell title="Ton mot de passe" intro="Choisis-en un solide, tu t’en serviras sur scène.">
      <PasswordForm />
    </AuthShell>
  )
}
