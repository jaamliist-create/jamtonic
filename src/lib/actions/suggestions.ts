'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { memberOrNull, NOT_MEMBER } from '@/lib/security/member'
import { uuidSchema } from '@/lib/domain/schemas'
import type { ActionResult } from '@/lib/domain/types'

const refresh = () => revalidatePath('/espace', 'layout')

/**
 * Seul chemin d'une suggestion vers le catalogue : un membre le décide.
 * Crée une tune « À découvrir » (ou rattache celle qui existe déjà).
 */
export async function createSongFromSuggestion(suggestionId: string): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  if (!uuidSchema.safeParse(suggestionId).success) {
    return { ok: false, error: 'Suggestion introuvable.' }
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('create_song_from_suggestion', {
    p_suggestion: suggestionId,
  })
  if (error) return { ok: false, error: error.message }
  const result = data as { song_id: string; existed: boolean }
  refresh()
  return {
    ok: true,
    id: result.song_id,
    message: result.existed
      ? 'Cette tune était déjà au catalogue : suggestion rattachée.'
      : 'Tune ajoutée dans « À découvrir ».',
  }
}

/** Écarte (ou remet en attente) toutes les suggestions identiques à celle-ci. */
export async function setSuggestionDismissed(
  suggestionId: string,
  dismissed: boolean,
): Promise<ActionResult> {
  const member = await memberOrNull()
  if (!member) return NOT_MEMBER
  if (!uuidSchema.safeParse(suggestionId).success) {
    return { ok: false, error: 'Suggestion introuvable.' }
  }
  const supabase = await createClient()
  const { data: ref } = await supabase
    .from('public_suggestions')
    .select('title_norm, artist_norm')
    .eq('id', suggestionId)
    .maybeSingle()
  if (!ref) return { ok: false, error: 'Suggestion introuvable.' }

  const { error } = await supabase
    .from('public_suggestions')
    .update(
      dismissed
        ? { status: 'ecartee', handled_by: member.userId, handled_at: new Date().toISOString() }
        : { status: 'nouvelle', handled_by: null, handled_at: null },
    )
    .eq('title_norm', ref.title_norm ?? '')
    .eq('artist_norm', ref.artist_norm ?? '')
    .eq('status', dismissed ? 'nouvelle' : 'ecartee')
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}
