import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { LearningPriority, SongStatus } from '@/lib/domain/types'

export type SongListItem = {
  id: string
  title: string
  artist: string
  status: SongStatus
  learning_priority: LearningPriority | null
  duration_seconds: number | null
  year: number | null
  archived_at: string | null
  updated_at: string
  genres: string[]
  tags: string[]
}

const LIST_COLUMNS =
  'id, title, artist, status, learning_priority, duration_seconds, year, archived_at, updated_at, song_genres(genres(name)), song_tags(tags(name))'

type ListRow = Omit<SongListItem, 'genres' | 'tags'> & {
  song_genres: { genres: { name: string } | null }[]
  song_tags: { tags: { name: string } | null }[]
}

function toItem(row: ListRow): SongListItem {
  const { song_genres, song_tags, ...song } = row
  return {
    ...song,
    genres: song_genres.flatMap((g) => g.genres?.name ?? []).sort((a, b) => a.localeCompare(b, 'fr')),
    tags: song_tags.flatMap((t) => t.tags?.name ?? []).sort((a, b) => a.localeCompare(b, 'fr')),
  }
}

/** Tout le catalogue (archives comprises). Le filtrage se fait à l'écran : c'est instantané. */
export async function listSongs(): Promise<SongListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('songs').select(LIST_COLUMNS).order('title')
  if (error) throw new Error(error.message)
  return (data as unknown as ListRow[]).map(toItem)
}

export async function listSongsByStatus(statuses: SongStatus[]): Promise<SongListItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('songs')
    .select(LIST_COLUMNS)
    .in('status', statuses)
    .is('archived_at', null)
    .order('title')
  if (error) throw new Error(error.message)
  return (data as unknown as ListRow[]).map(toItem)
}

export async function listLabels() {
  const supabase = await createClient()
  const [genres, tags] = await Promise.all([
    supabase.from('genres').select('name').order('name'),
    supabase.from('tags').select('name').order('name'),
  ])
  return {
    genres: (genres.data ?? []).map((g) => g.name),
    tags: (tags.data ?? []).map((t) => t.name),
  }
}

export async function getSong(id: string, memberId: string) {
  const supabase = await createClient()
  const { data: song, error } = await supabase
    .from('songs')
    .select(
      '*, song_genres(genres(name)), song_tags(tags(name)), editor:profiles!songs_updated_by_fkey(display_name), playlist_songs(playlists(id, name, archived_at))',
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!song) return null

  const { data: note } = await supabase
    .from('song_member_notes')
    .select('body')
    .eq('song_id', id)
    .eq('member_id', memberId)
    .maybeSingle()

  return {
    song,
    genres: song.song_genres.flatMap((g) => g.genres?.name ?? []),
    tags: song.song_tags.flatMap((t) => t.tags?.name ?? []),
    editorName: song.editor?.display_name ?? null,
    playlists: song.playlist_songs.flatMap((p) => (p.playlists ? [p.playlists] : [])),
    myNote: note?.body ?? '',
  }
}

export type DiscoverItem = {
  id: string
  title: string
  artist: string
  created_at: string
  votes: number
  voted: boolean
}

/** Tunes « À découvrir » avec leurs votes internes, les plus votées d'abord. */
export async function listDiscover(memberId: string): Promise<DiscoverItem[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('songs')
    .select('id, title, artist, created_at, internal_votes(member_id)')
    .eq('status', 'a_decouvrir')
    .is('archived_at', null)
  if (error) throw new Error(error.message)
  return data
    .map((s) => ({
      id: s.id,
      title: s.title,
      artist: s.artist,
      created_at: s.created_at,
      votes: s.internal_votes.length,
      voted: s.internal_votes.some((v) => v.member_id === memberId),
    }))
    .sort((a, b) => b.votes - a.votes || a.title.localeCompare(b.title, 'fr'))
}

export async function listActivity(limit: number) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('activity_log')
    .select('id, action, entity_type, entity_id, summary, meta, created_at, profiles(display_name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw new Error(error.message)
  return data
}
