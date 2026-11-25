'use client'

import Link from 'next/link'
import { requestPasswordReset, setPassword, signIn } from '@/lib/actions/auth'
import { FormMessage, SubmitButton, useActionForm } from '@/components/ui/form'

export function LoginForm({ next }: { next?: string }) {
  const { state, onSubmit, pending } = useActionForm(signIn, null)
  return (
    <form onSubmit={onSubmit} className="space-y-4" data-testid="login-form">
      <input type="hidden" name="next" value={next ?? ''} />
      <div>
        <label className="label" htmlFor="login">
          Identifiant ou courriel
        </label>
        <input
          id="login"
          name="login"
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor="password">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="btn btn-primary w-full">Entrer</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/mot-de-passe-oublie" className="text-muted underline underline-offset-4">
          Mot de passe oublié ?
        </Link>
      </p>
    </form>
  )
}

export function ResetForm() {
  const { state, onSubmit, pending } = useActionForm(requestPasswordReset, null)
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="email">
          Courriel
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field" />
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="btn btn-primary w-full">Recevoir le lien</SubmitButton>
      <p className="text-center text-sm">
        <Link href="/connexion" className="text-muted underline underline-offset-4">
          Retour à la connexion
        </Link>
      </p>
    </form>
  )
}

export function PasswordForm() {
  const { state, onSubmit, pending } = useActionForm(setPassword, null)
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="password">
          Nouveau mot de passe (10 caractères ou plus)
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          className="field"
        />
      </div>
      <div>
        <label className="label" htmlFor="confirm">
          Encore une fois
        </label>
        <input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={10}
          required
          className="field"
        />
      </div>
      <FormMessage state={state} />
      <SubmitButton pending={pending} className="btn btn-primary w-full">Enregistrer</SubmitButton>
    </form>
  )
}
