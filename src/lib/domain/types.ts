import type { Database } from '@/lib/supabase/database.types'

type Tables = Database['public']['Tables']

export type SongStatus = Database['public']['Enums']['song_status']
export type SessionStatus = Database['public']['Enums']['session_status']
export type SuggestionStatus = Database['public']['Enums']['suggestion_status']

export type Profile = Tables['profiles']['Row']
export type Song = Tables['songs']['Row']
export type Genre = Tables['genres']['Row']
export type Tag = Tables['tags']['Row']
export type Playlist = Tables['playlists']['Row']
export type ConcertSession = Tables['concert_sessions']['Row']
export type PublicSuggestion = Tables['public_suggestions']['Row']
export type ActivityEntry = Tables['activity_log']['Row']
export type PublicSong = {
  id: string
  title: string
  artist: string
  duration_seconds: number | null
  year: number | null
  genres: string[]
}

export type SongLink = { label: string; url: string }

/** Les cinq statuts, dans l'ordre du parcours. Aucune transition n'est imposée. */
export const SONG_STATUSES = [
  'a_decouvrir',
  'a_apprendre',
  'en_cours',
  'a_reviser',
  'maitrise',
] as const satisfies readonly SongStatus[]

export const SONG_STATUS_LABEL: Record<SongStatus, string> = {
  a_decouvrir: 'À découvrir',
  a_apprendre: 'À apprendre',
  en_cours: 'En cours',
  a_reviser: 'À réviser',
  maitrise: 'Maîtrisé',
}

export type LearningPriority = Database['public']['Enums']['learning_priority']

/**
 * Priorité d'apprentissage, de la plus pressante à la moins pressante.
 * Ce n'est pas un statut : le statut dit où en est la tune, la priorité dit
 * à quel point on veut l'apprendre.
 */
export const LEARNING_PRIORITIES = [
  'urgent',
  'moyen_terme',
  'pour_le_fun',
] as const satisfies readonly LearningPriority[]

export const LEARNING_PRIORITY_LABEL: Record<LearningPriority, string> = {
  urgent: 'Urgent',
  moyen_terme: 'Moyen terme',
  pour_le_fun: 'Pour le fun',
}

export function isLearningPriority(v: unknown): v is LearningPriority {
  return typeof v === 'string' && (LEARNING_PRIORITIES as readonly string[]).includes(v)
}

export const SESSION_STATUSES = [
  'brouillon',
  'programmee',
  'active',
  'terminee',
] as const satisfies readonly SessionStatus[]

export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  brouillon: 'Brouillon',
  programmee: 'Programmée',
  active: 'Active',
  terminee: 'Terminée',
}

export function isSongStatus(v: unknown): v is SongStatus {
  return typeof v === 'string' && (SONG_STATUSES as readonly string[]).includes(v)
}

export function isSessionStatus(v: unknown): v is SessionStatus {
  return typeof v === 'string' && (SESSION_STATUSES as readonly string[]).includes(v)
}

/** Lit la colonne jsonb `links` sans faire confiance à son contenu. */
export function parseLinks(value: unknown): SongLink[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((l) => {
    if (l && typeof l === 'object' && 'url' in l && typeof l.url === 'string') {
      const label = 'label' in l && typeof l.label === 'string' ? l.label : ''
      return /^https?:\/\//i.test(l.url) ? [{ label, url: l.url }] : []
    }
    return []
  })
}

/** Résultat uniforme des Server Actions. */
export type ActionResult =
  | { ok: true; message?: string; id?: string }
  | { ok: false; error: string; existingId?: string }
