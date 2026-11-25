import { SESSION_STATUS_LABEL, SONG_STATUS_LABEL, isSessionStatus, isSongStatus } from './types'

type Entry = { action: string; summary: string; meta: unknown }

function metaValue(meta: unknown, key: string): unknown {
  return meta && typeof meta === 'object' && key in meta ? (meta as Record<string, unknown>)[key] : null
}

/** Phrase lisible pour une ligne du journal d'activité. */
export function describeActivity(entry: Entry): string {
  const to = metaValue(entry.meta, 'to')
  switch (entry.action) {
    case 'song_created':
      return `a ajouté « ${entry.summary} »`
    case 'song_status_changed':
      return `a passé « ${entry.summary} » à ${isSongStatus(to) ? SONG_STATUS_LABEL[to] : 'un autre statut'}`
    case 'song_updated':
      return `a modifié « ${entry.summary} »`
    case 'song_archived':
      return `a archivé « ${entry.summary} »`
    case 'song_restored':
      return `a restauré « ${entry.summary} »`
    case 'playlist_created':
      return `a créé la playlist « ${entry.summary} »`
    case 'session_created':
      return `a créé la session « ${entry.summary} »`
    case 'session_status_changed':
      return `a passé la session « ${entry.summary} » à ${isSessionStatus(to) ? SESSION_STATUS_LABEL[to] : 'un autre statut'}`
    default:
      return entry.summary
  }
}
