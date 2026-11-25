'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { memberOrNull, NOT_MEMBER } from '@/lib/security/member'
import { normalize } from '@/lib/domain/normalize'
import { firstError, proposeSchema, songSchema, uuidSchema } from '@/lib/domain/schemas'
import { isLearningPriority, isSongStatus, type ActionResult } from '@/lib/domain/types'

type Supabase = Awaited<ReturnType<typeof createClient>>

function refresh() {
  revalidatePath('/espace', 'layout')
  revalidatePath('/')
}

function parseSongForm(formData: FormData) {
  const labels = formData.getAll('link_label').map(String)
  const urls = formData.getAll('link_url').map(String)
  const links = urls
    .map((url, i) => ({ url, label: labels[i] ?? '' }))
    .filter((l) => l.url.trim() !== '')
  return songSchema.safeParse({
    title: formData.get('title'),
    artist: formData.get('artist'),
    status: formData.get('status') ?? 'a_decouvrir',
    learning_priority: String(formData.get('learning_priority') ?? ''),
    duration_seconds: String(formData.get('duration') ?? ''),
    year: String(formData.get('year') ?? ''),
    musical_key: String(formData.get('musical_key') ?? ''),
    bpm: String(formData.get('bpm') ?? ''),
    notes: String(formData.get('notes') ?? ''),
    links,
    genres: formData.getAll('genres').map(String).filter(Boolean),
    tags: formData.getAll('tags').map(String).filter(Boolean),
  })
}

async function findDuplicate(supabase: Supabase, title: string, artist: string, exceptId?: string) {
  let query = supabase
    .from('songs')
    .select('id')
    .eq('title_norm', normalize(title))
    .eq('artist_norm', normalize(artist))
  if (exceptId) query = query.neq('id', exceptId)
  const { data } = await query.maybeSingle()
  return data?.id ?? null
}

const DUPLICATE = 'Cette tune est déjà dans le catalogue.'

/** Remplace les genres ou les étiquettes d'une tune, en créant ceux qui manquent. */
async function syncLabels(
  supabase: Supabase,
  kind: 'genres' | 'tags',
  songId: string,
  names: string[],
): Promise<string | null> {
  const wanted = new Map(names.map((n) => [normalize(n), n]))
  wanted.delete('')

  const { data: existing, error } = await supabase.from(kind).select('id, name_norm')
  if (error) return error.message
  const idByNorm = new Map(existing.map((r) => [r.name_norm ?? '', r.id]))

  const missing = [...wanted].filter(([norm]) => !idByNorm.has(norm)).map(([, name]) => ({ name }))
  if (missing.length > 0) {
    const { data: created, error: insertError } = await supabase
      .from(kind)
      .insert(missing)
      .select('id, name_norm')
    if (insertError) return insertError.message
    for (const r of created) idByNorm.set(r.name_norm ?? '', r.id)
  }

  const ids = [...wanted.keys()].flatMap((norm) => idByNorm.get(norm) ?? [])
  if (kind === 'genres') {
    const { error: delError } = await supabase.from('song_genres').delete().eq('song_id', songId)
    if (delError) return delError.message
    if (ids.length > 0) {
      const { error: e } = await supabase
        .from('song_genres')
        .insert(ids.map((genre_id) => ({ song_id: songId, genre_id })))
      if (e) return e.message
    }
  } else {
    const { error: delError } = await supabase.from('song_tags').delete().eq('song_id', songId)
    if (delError) return delError.message
    if (ids.length > 0) {
      const { error: e } = await supabase
        .from('song_tags')
        .insert(ids.map((tag_id) => ({ song_id: songId, tag_id })))
      if (e) return e.message
    }
  }
  return null
}

export async function saveSong(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  const parsed = parseSongForm(formData)
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }
  const { genres, tags, ...fields } = parsed.data

  const rawId = formData.get('id')
  const id = rawId ? uuidSchema.safeParse(rawId).data : undefined
  if (rawId && !id) return { ok: false, error: 'Tune introuvable.' }

  const supabase = await createClient()
  const duplicate = await findDuplicate(supabase, fields.title, fields.artist, id)
  if (duplicate) return { ok: false, error: DUPLICATE, existingId: duplicate }

  let songId = id
  if (id) {
    const { error } = await supabase.from('songs').update(fields).eq('id', id)
    if (error) return { ok: false, error: error.code === '23505' ? DUPLICATE : error.message }
  } else {
    const { data, error } = await supabase.from('songs').insert(fields).select('id').single()
    if (error) return { ok: false, error: error.code === '23505' ? DUPLICATE : error.message }
    songId = data.id
  }
  if (!songId) return { ok: false, error: 'Enregistrement impossible.' }

  const labelError =
    (await syncLabels(supabase, 'genres', songId, genres)) ??
    (await syncLabels(supabase, 'tags', songId, tags))
  if (labelError) return { ok: false, error: `Tune enregistrée, mais pas ses genres : ${labelError}` }

  refresh()
  return { ok: true, id: songId, message: id ? 'Tune enregistrée.' : 'Tune ajoutée.' }
}

/** Changement de statut : manuel, direct, sans transition imposée. */
export async function setSongStatus(songId: string, status: string): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  if (!uuidSchema.safeParse(songId).success || !isSongStatus(status)) {
    return { ok: false, error: 'Statut invalide.' }
  }
  const supabase = await createClient()
  const { error } = await supabase.from('songs').update({ status }).eq('id', songId)
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true }
}

/** Priorité d'apprentissage : manuelle, indépendante du statut. null = aucune. */
export async function setSongPriority(songId: string, priority: string | null): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  if (!uuidSchema.safeParse(songId).success || (priority !== null && !isLearningPriority(priority))) {
    return { ok: false, error: 'Priorité invalide.' }
  }
  const supabase = await createClient()
  const { error } = await supabase
    .from('songs')
    .update({ learning_priority: priority })
    .eq('id', songId)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/espace', 'layout')
  return { ok: true }
}

export async function setSongArchived(songId: string, archived: boolean): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  if (!uuidSchema.safeParse(songId).success) return { ok: false, error: 'Tune introuvable.' }
  const supabase = await createClient()
  const { error } = await supabase
    .from('songs')
    .update({ archived_at: archived ? new Date().toISOString() : null })
    .eq('id', songId)
  if (error) return { ok: false, error: error.message }
  refresh()
  return { ok: true, message: archived ? 'Tune archivée.' : 'Tune restaurée.' }
}

/** Notes personnelles : visibles par leur auteur seulement (RLS). */
export async function saveMemberNote(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const member = await memberOrNull()
  if (!member) return NOT_MEMBER
  const songId = uuidSchema.safeParse(formData.get('song_id')).data
  const body = String(formData.get('body') ?? '')
  if (!songId) return { ok: false, error: 'Tune introuvable.' }
  if (body.length > 20000) return { ok: false, error: 'Note trop longue.' }

  const supabase = await createClient()
  const { error } = await supabase
    .from('song_member_notes')
    .upsert({ song_id: songId, member_id: member.userId, body })
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/espace/catalogue/${songId}`)
  return { ok: true, message: 'Notes enregistrées.' }
}

/** Proposition interne : crée une tune « À découvrir ». */
export async function proposeSong(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  if (!(await memberOrNull())) return NOT_MEMBER
  const parsed = proposeSchema.safeParse({
    title: formData.get('title'),
    artist: formData.get('artist'),
  })
  if (!parsed.success) return { ok: false, error: firstError(parsed.error) }

  const supabase = await createClient()
  const duplicate = await findDuplicate(supabase, parsed.data.title, parsed.data.artist)
  if (duplicate) return { ok: false, error: DUPLICATE, existingId: duplicate }

  const { data, error } = await supabase
    .from('songs')
    .insert({ ...parsed.data, status: 'a_decouvrir' })
    .select('id')
    .single()
  if (error) return { ok: false, error: error.code === '23505' ? DUPLICATE : error.message }
  refresh()
  return { ok: true, id: data.id, message: 'Tune proposée !' }
}

/** Vote interne. L'unicité et la règle « À découvrir seulement » sont garanties en base. */
export async function setInternalVote(songId: string, on: boolean): Promise<ActionResult> {
  const member = await memberOrNull()
  if (!member) return NOT_MEMBER
  if (!uuidSchema.safeParse(songId).success) return { ok: false, error: 'Tune introuvable.' }
  const supabase = await createClient()
  if (on) {
    const { error } = await supabase
      .from('internal_votes')
      .insert({ song_id: songId, member_id: member.userId })
    // 23505 : déjà voté — l'état voulu est atteint.
    if (error && error.code !== '23505') {
      return { ok: false, error: 'On ne peut voter que pour une tune « À découvrir ».' }
    }
  } else {
    const { error } = await supabase
      .from('internal_votes')
      .delete()
      .eq('song_id', songId)
      .eq('member_id', member.userId)
    if (error) return { ok: false, error: error.message }
  }
  revalidatePath('/espace', 'layout')
  return { ok: true }
}
