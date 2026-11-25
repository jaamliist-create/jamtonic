import 'server-only'
import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MUST_CHANGE_PASSWORD } from '@/lib/domain/login'
import type { Profile } from '@/lib/domain/types'

export type SessionContext = {
  userId: string
  email: string | null
  /** Mot de passe posé par `npm run account` : à remplacer avant tout accès à l'espace. */
  mustChangePassword: boolean
  /** null : compte connecté mais sans profil actif — aucun accès. */
  profile: Profile | null
}
export type MemberContext = SessionContext & { profile: Profile }

/** Session courante, mémorisée pour la durée de la requête. */
export const getSessionContext = cache(async (): Promise<SessionContext | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  // La RLS ne renvoie le profil que s'il est actif (is_member()).
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  return {
    userId: user.id,
    email: user.email ?? null,
    mustChangePassword: user.app_metadata[MUST_CHANGE_PASSWORD] === true,
    profile: profile?.is_active ? profile : null,
  }
})

/** Pour les pages : redirige si pas connecté ou sans profil actif. */
export async function requireMember(): Promise<MemberContext> {
  const ctx = await getSessionContext()
  if (!ctx) redirect('/connexion')
  if (!ctx.profile) redirect('/espace')
  if (ctx.mustChangePassword) redirect('/definir-mot-de-passe')
  return ctx as MemberContext
}

/** Pour les Server Actions : null si l'appelant n'est pas un membre actif. */
export async function memberOrNull(): Promise<MemberContext | null> {
  const ctx = await getSessionContext()
  if (!ctx?.profile || ctx.mustChangePassword) return null
  return ctx as MemberContext
}

export const NOT_MEMBER = { ok: false as const, error: 'Accès réservé aux membres du band.' }
