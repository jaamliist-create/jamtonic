'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { memberOrNull, NOT_MEMBER } from '@/lib/security/member'
import { env } from '@/lib/env'
import { firstError, inviteSchema, profileSchema, uuidSchema } from '@/lib/domain/schemas'
import type { ActionResult } from '@/lib/domain/types'

const OWNER_ONLY = { ok: false as const, error: 'Réservé au propriétaire technique.' }

export async function updateProfile(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const member = await memberOrNull()
  if (!member) return NOT_MEMBER
  const parsed = profileSchema.safeParse({
    display_name: formData.get('display_name'),
    instrument: String(formData.get('instrument') ?? ''),
  })
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  const supabase = await createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ display_name: parsed.data.display_name, instrument: parsed.data.instrument || null })
    .eq('id', member.userId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/espace', 'layout')
  return { ok: true, message: 'Profil enregistré.' }
}

/**
 * Invitation : opération sensible, réservée au propriétaire technique.
 * Le droit est vérifié ici, puis le client service_role envoie l'invitation
 * et prépare le profil. Aucune inscription publique n'existe.
 */
export async function inviteMember(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const member = await memberOrNull()
  if (!member) return NOT_MEMBER
  if (!member.profile.is_owner) return OWNER_ONLY

  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    display_name: formData.get('display_name'),
  })
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${env.siteUrl}/auth/confirm?next=/definir-mot-de-passe`,
  })
  if (error || !data.user) {
    const exists = error?.message.toLowerCase().includes('already')
    return {
      ok: false,
      error: exists ? 'Ce courriel a déjà un compte.' : `Invitation impossible : ${error?.message}`,
    }
  }
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: data.user.id, display_name: parsed.data.display_name })
  if (profileError) return { ok: false, error: profileError.message }

  revalidatePath('/espace/groupe')
  return { ok: true, message: `Invitation envoyée à ${parsed.data.email}.` }
}

export async function setMemberActive(memberId: string, active: boolean): Promise<ActionResult> {
  const member = await memberOrNull()
  if (!member) return NOT_MEMBER
  if (!member.profile.is_owner) return OWNER_ONLY
  if (!uuidSchema.safeParse(memberId).success) return { ok: false, error: 'Membre introuvable.' }
  if (memberId === member.userId) {
    return { ok: false, error: 'Tu ne peux pas désactiver ton propre accès.' }
  }
  const admin = createAdminClient()
  const { error } = await admin.from('profiles').update({ is_active: active }).eq('id', memberId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/espace/groupe')
  return { ok: true, message: active ? 'Accès réactivé.' : 'Accès désactivé.' }
}
