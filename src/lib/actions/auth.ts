'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'
import { loginToEmail, MUST_CHANGE_PASSWORD } from '@/lib/domain/login'
import { passwordSchema } from '@/lib/domain/schemas'
import type { ActionResult } from '@/lib/domain/types'

/** N'accepte qu'un chemin interne (évite les redirections ouvertes). */
function safeNext(value: FormDataEntryValue | null): string {
  const v = typeof value === 'string' ? value : ''
  return v.startsWith('/espace') ? v : '/espace'
}

export async function signIn(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const login = String(formData.get('login') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  if (!login || !password) return { ok: false, error: 'Identifiant et mot de passe requis.' }

  const INCORRECT = { ok: false as const, error: 'Identifiant ou mot de passe incorrect.' }
  const email = loginToEmail(login)
  if (!email) return INCORRECT

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return INCORRECT
  redirect(safeNext(formData.get('next')))
}

export async function signOut(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/connexion')
}

export async function requestPasswordReset(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { ok: false, error: 'Courriel requis.' }
  const supabase = await createClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/definir-mot-de-passe`,
  })
  // Même réponse que le compte existe ou non.
  return { ok: true, message: 'Si ce courriel est celui d’un membre, un lien vient de partir.' }
}

export async function setPassword(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const parsed = passwordSchema.safeParse(String(formData.get('password') ?? ''))
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalide' }
  if (parsed.data !== String(formData.get('confirm') ?? '')) {
    return { ok: false, error: 'Les deux mots de passe ne sont pas identiques.' }
  }
  const supabase = await createClient()
  const { data, error } = await supabase.auth.updateUser({ password: parsed.data })
  if (error?.code === 'same_password') {
    return { ok: false, error: 'Choisis un mot de passe différent de l’ancien.' }
  }
  if (error || !data.user) return { ok: false, error: 'Impossible d’enregistrer ce mot de passe. Réessaie.' }

  if (data.user.app_metadata[MUST_CHANGE_PASSWORD] === true) {
    // app_metadata ne se modifie qu'avec service_role ; l'identité vient de la session vérifiée.
    const { error: flagError } = await createAdminClient().auth.admin.updateUserById(data.user.id, {
      app_metadata: { [MUST_CHANGE_PASSWORD]: false },
    })
    if (flagError) {
      return { ok: false, error: 'Mot de passe enregistré, mais l’accès n’a pas pu être ouvert. Réessaie.' }
    }
  }
  redirect('/espace')
}
