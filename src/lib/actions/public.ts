'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { suggestionSchema, uuidSchema } from '@/lib/domain/schemas'
import { issueParticipant, networkKey, readParticipant } from '@/lib/security/participant'
import { allow, LIMITS } from '@/lib/security/rate-limit'

/**
 * Écritures du public. Tout est décidé ici, côté serveur :
 * identité du participant (témoin signé), limite de fréquence, puis fonction SQL
 * qui revérifie la session, la sélection, le statut de la tune et le plafond.
 * Le navigateur n'envoie jamais de compteur ni d'identifiant.
 */

export type VoteResult =
  | { ok: true; voted: boolean; used: number }
  | { ok: false; reason: 'closed' | 'not_available' | 'limit' | 'slow_down' | 'error'; used?: number }

const SLUG_RE = /^[a-z0-9]{6,20}$/

async function participantForWrite(net: string): Promise<string | null> {
  const existing = await readParticipant()
  if (existing) return existing
  if (!(await allow('participant:new', net, LIMITS.newParticipantByNetwork))) return null
  return issueParticipant()
}

export async function togglePublicVote(slug: string, songId: string, on: boolean): Promise<VoteResult> {
  if (!SLUG_RE.test(slug) || !uuidSchema.safeParse(songId).success || typeof on !== 'boolean') {
    return { ok: false, reason: 'error' }
  }
  try {
    const net = await networkKey()
    if (!(await allow('vote:net', net, LIMITS.voteByNetwork))) {
      return { ok: false, reason: 'slow_down' }
    }
    const participant = await participantForWrite(net)
    if (!participant) return { ok: false, reason: 'slow_down' }
    if (!(await allow('vote:participant', participant, LIMITS.voteByParticipant))) {
      return { ok: false, reason: 'slow_down' }
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('cast_public_vote', {
      p_slug: slug,
      p_song: songId,
      p_participant: participant,
      p_on: on,
    })
    if (error) throw error
    const res = data as { result: string; used?: number }
    switch (res.result) {
      case 'added':
        return { ok: true, voted: true, used: res.used ?? 0 }
      case 'removed':
        return { ok: true, voted: false, used: res.used ?? 0 }
      case 'limit':
        return { ok: false, reason: 'limit', used: res.used }
      case 'closed':
        return { ok: false, reason: 'closed' }
      default:
        return { ok: false, reason: 'not_available' }
    }
  } catch (e) {
    console.error('[vote]', e)
    return { ok: false, reason: 'error' }
  }
}

export type SuggestState = { status: 'idle' | 'ok' | 'error'; error?: string }

/** Suggestion du public. Ne crée jamais de tune dans le catalogue. */
export async function submitSuggestion(_prev: SuggestState, formData: FormData): Promise<SuggestState> {
  // Champ piège invisible : un robot le remplit, on fait semblant d'accepter.
  if (String(formData.get('site_web') ?? '') !== '') return { status: 'ok' }

  const parsed = suggestionSchema.safeParse({
    title: formData.get('title'),
    artist: formData.get('artist'),
  })
  if (!parsed.success) {
    return { status: 'error', error: 'Il nous faut le titre et l’artiste (120 caractères max).' }
  }
  const rawSlug = String(formData.get('slug') ?? '')
  const slug = SLUG_RE.test(rawSlug) ? rawSlug : undefined

  try {
    const net = await networkKey()
    if (!(await allow('suggest:net', net, LIMITS.suggestByNetwork))) {
      return { status: 'error', error: 'Wô, pas si vite ! Réessaie dans quelques minutes.' }
    }
    const participant = await participantForWrite(net)
    if (!participant || !(await allow('suggest:participant', participant, LIMITS.suggestByParticipant))) {
      return { status: 'error', error: 'Wô, pas si vite ! Réessaie dans quelques minutes.' }
    }

    const admin = createAdminClient()
    const { data, error } = await admin.rpc('submit_public_suggestion', {
      p_title: parsed.data.title,
      p_artist: parsed.data.artist,
      p_slug: slug,
      p_participant: participant,
    })
    if (error) throw error
    if (data === 'invalid') {
      return { status: 'error', error: 'Il nous faut le titre et l’artiste (120 caractères max).' }
    }
    return { status: 'ok' } // « ok » ou « duplicate » : même remerciement.
  } catch (e) {
    console.error('[suggestion]', e)
    return { status: 'error', error: 'Oups, ça n’a pas passé. Réessaie dans un instant.' }
  }
}
