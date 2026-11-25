'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { memberOrNull, NOT_MEMBER } from '@/lib/security/member'
import { firstError, playlistSchema, uuidSchema } from '@/lib/domain/schemas'
import type { ActionResult } from '@/lib/domain/types'

const refresh = () => revalidatePath('/espace', 'layout')
const idList = z.array(z.uuid()).max(500)

export async function savePlaylist(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  const parsed = playlistSchema.safeParse({
    name: formData.get('name'),
    description: String(formData.get('description') ?? ''),
  })
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const supabase = await createClient()
  const rawId = formData.get('id')
  if (rawId) {
    const id = uuidSchema.safeParse(rawId).data
    if (!id) return { ok: false, error: 'Playlist introuvable.' }
    const { error } = await supabase.from('playlists').update(parsed.data).eq('id', id)
    if (error) return { ok: false, error: error.message }
    refresh()
    return { ok: true, id, message: 'Playlist enregistrée.' }
  }
  const { data, error } = await supabase.from('playlists').insert(parsed.data).select('id').single()
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true, id: data.id, message: 'Playlist créée.' }
}

export async function setPlaylistArchived(id: string, archived: boolean): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  if (!uuidSchema.safeParse(id).success) return { ok: false, error: 'Playlist introuvable.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('playlists')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', id)
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true, message: archived ? 'Playlist archivée.' : 'Playlist restaurée.' }
}

export async function duplicatePlaylist(id: string, name: string): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  const cleanName = name.trim().slice(0, 80)
  if (!uuidSchema.safeParse(id).success || !cleanName) {
    return { ok: false, error: 'Playlist introuvable.' }
  }
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('duplicate_playlist', {
    p_playlist: id,
    p_name: cleanName,
  })
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true, id: data, message: 'Playlist dupliquée.' }
}

/** N'importe quelle tune du catalogue, quel que soit son statut. */
export async function addSongToPlaylist(playlistId: string, songId: string): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  if (!uuidSchema.safeParse(playlistId).success || !uuidSchema.safeParse(songId).success) {
    return { ok: false, error: 'Introuvable.' }
  }
  const supabase = await createClient()
  const { error } = await supabase.rpc('add_song_to_playlist', {
    p_playlist: playlistId,
    p_song: songId,
  })
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}

export async function removeSongFromPlaylist(
  playlistId: string,
  songId: string,
): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  if (!uuidSchema.safeParse(playlistId).success || !uuidSchema.safeParse(songId).success) {
    return { ok: false, error: 'Introuvable.' }
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('playlist_songs')
    .delete()
    .eq('playlist_id', playlistId)
    .eq('song_id', songId)
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}

export async function reorderPlaylist(playlistId: string, songIds: string[]): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  const ids = idList.safeParse(songIds)
  if (!uuidSchema.safeParse(playlistId).success || !ids.success) {
    return { ok: false, error: 'Ordre invalide.' }
  }
  const supabase = await createClient()
  const { error } = await supabase.rpc('reorder_playlist', {
    p_playlist: playlistId,
    p_song_ids: ids.data,
  })
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}
