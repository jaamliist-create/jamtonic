import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { readParticipant } from '@/lib/security/participant'
import { todayIso } from '@/lib/domain/format'
import type { PublicSong, SessionStatus } from '@/lib/domain/types'

/**
 * Lectures du site public. Elles passent par le client anonyme : seules les vues
 * et fonctions publiques répondent, donc rien de privé ne peut sortir d'ici.
 */

export type PublicConcert = {
  slug: string
  name: string
  venue: string | null
  starts_on: string
  starts_at: string | null
  status: SessionStatus
  voting_open: boolean
}

export type PublicSession = PublicConcert & { max_votes_per_participant: number | null }

/** Répertoire public : uniquement les tunes « Maîtrisé » (règle appliquée par la vue SQL). */
export async function getPublicSongs(): Promise<PublicSong[]> {
  const { data, error } = await createPublicClient()
    .from('public_songs')
    .select('id, title, artist, duration_seconds, year, genres')
    .order('title')
  if (error) throw new Error(error.message)
  return data as PublicSong[]
}

/** Sessions annoncées : en cours, ou à venir. */
export async function getPublicConcerts(): Promise<PublicConcert[]> {
  const { data, error } = await createPublicClient()
    .from('public_concerts')
    .select('slug, name, venue, starts_on, starts_at, status, voting_open')
    .or(`status.eq.active,starts_on.gte.${todayIso()}`)
    .order('starts_on')
  if (error) throw new Error(error.message)
  return data as PublicConcert[]
}

export async function getPublicSession(slug: string): Promise<PublicSession | null> {
  const { data, error } = await createPublicClient().rpc('public_get_session', { p_slug: slug })
  if (error) throw new Error(error.message)
  return (data?.[0] as PublicSession | undefined) ?? null
}

export async function getPublicSessionSongs(slug: string) {
  const { data, error } = await createPublicClient().rpc('public_session_songs', { p_slug: slug })
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Les votes du spectateur courant (d'après son témoin signé). Jamais ceux des autres. */
export async function getMyVotes(slug: string): Promise<string[]> {
  const participant = await readParticipant()
  if (!participant) return []
  const { data, error } = await createAdminClient().rpc('participant_votes', {
    p_slug: slug,
    p_participant: participant,
  })
  if (error) throw new Error(error.message)
  return data ?? []
}
