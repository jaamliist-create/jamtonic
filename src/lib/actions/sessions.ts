'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { memberOrNull, NOT_MEMBER } from '@/lib/security/member'
import { firstError, sessionSchema, uuidSchema } from '@/lib/domain/schemas'
import { isSessionStatus, type ActionResult } from '@/lib/domain/types'

function refresh() {
  revalidatePath('/espace', 'layout')
  revalidatePath('/')
}
const idList = z.array(z.uuid()).max(500)

export async function saveSession(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  const parsed = sessionSchema.safeParse({
    name: formData.get('name'),
    venue: String(formData.get('venue') ?? ''),
    starts_on: String(formData.get('starts_on') ?? ''),
    starts_at: String(formData.get('starts_at') ?? ''),
    listed: formData.get('listed') === 'on',
    voting_open: formData.get('voting_open') === 'on',
    max_votes_per_participant: String(formData.get('max_votes') ?? ''),
  })
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  const fields = { ...parsed.data, venue: parsed.data.venue || null }

  const supabase = await createClient()
  const rawId = formData.get('id')
  if (rawId) {
    const id = uuidSchema.safeParse(rawId).data
    if (!id) return { ok: false, error: 'Session introuvable.' }
    const { error } = await supabase.from('concert_sessions').update(fields).eq('id', id)
    if (error) return { ok: false, error: error.message }
    refresh()
    return { ok: true, id, message: 'Session enregistrée.' }
  }
  const { data, error } = await supabase
    .from('concert_sessions')
    .insert(fields)
    .select('id')
    .single()
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true, id: data.id, message: 'Session créée.' }
}

export async function setSessionStatus(id: string, status: string): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  if (!uuidSchema.safeParse(id).success || !isSessionStatus(status)) {
    return { ok: false, error: 'Statut invalide.' }
  }
  const supabase = await createClient()
  const { error } = await supabase.from('concert_sessions').update({ status }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}

export async function setVotingOpen(id: string, open: boolean): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: 'Session introuvable.' }
  const supabase = await createClient()
  const { error } = await supabase.from('concert_sessions').update({ voting_open: open }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}

/** Remplace la sélection de tunes proposées au public pour cette session. */
export async function setSessionSongs(id: string, songIds: string[]): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  const ids = idList.safeParse(songIds)
  if (!uuidSchema.safeParse(id).success || !ids.success) {
    return { ok: false, error: 'Sélection invalide.' }
  }
  const supabase = await createClient()
  const { error } = await supabase.rpc('set_session_songs', { p_session: id, p_song_ids: ids.data })
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true, message: 'Sélection enregistrée.' }
}

/** Associe une playlist et reprend ses tunes maîtrisées comme sélection. */
export async function applySessionPlaylist(id: string, playlistId: string | null): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: 'Session introuvable.' }
  if (playlistId !== null && !uuidSchema.safeParse(playlistId).success) {
    return { ok: false, error: 'Playlist introuvable.' }
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('concert_sessions')
    .update({ playlist_id: playlistId })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }

  if (playlistId) {
    const { data: rows, error: readError } = await supabase
      .from('playlist_songs')
      .select('song_id, position, songs!inner(status, archived_at)')
      .eq('playlist_id', playlistId)
      .eq('songs.status', 'maitrise')
      .is('songs.archived_at', null)
      .order('position')
    if (readError) return { ok: false, error: readError.message }
    const { error: setError } = await supabase.rpc('set_session_songs', {
      p_session: id,
      p_song_ids: rows.map((r) => r.song_id),
    })
    if (setError) return { ok: false, error: setError.message }
  }
  refresh()
  return {
    ok: true,
    message: playlistId ? 'Tunes maîtrisées de la playlist reprises.' : 'Playlist dissociée.',
  }
}

export async function deleteDraftSession(id: string): Promise<void> {
  if (!(await memberOrNull())) return
  if (!uuidSchema.safeParse(id).success) return
  const supabase = await createClient()
  // La RLS ne permet la suppression que d'un brouillon.
  await supabase.from('concert_sessions').delete().eq('id', id).eq('status', 'brouillon')
  refresh()
  redirect('/espace/sessions')
}
