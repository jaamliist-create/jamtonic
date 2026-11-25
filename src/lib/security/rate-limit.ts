import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Limite de fréquence côté serveur (compteur en base, fenêtre fixe).
 * Renvoie true si la requête est permise. En cas de panne du compteur,
 * on refuse : mieux vaut un vote perdu qu'une porte ouverte.
 */
export async function allow(
  bucket: string,
  key: string,
  limit: { max: number; window: number },
): Promise<boolean> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('check_rate_limit', {
    p_bucket: bucket,
    p_key: key,
    p_max: limit.max,
    p_window_seconds: limit.window,
  })
  if (error) {
    console.error('[rate-limit]', error.message)
    return false
  }
  return data === true
}

/**
 * Seuils (max par fenêtre en secondes). Dans un bar, beaucoup de téléphones partagent
 * la même adresse (Wi-Fi) : les limites par adresse sont larges, celles par
 * participant sont serrées.
 */
export const LIMITS = {
  voteByNetwork: { max: 900, window: 300 },
  voteByParticipant: { max: 60, window: 60 },
  newParticipantByNetwork: { max: 150, window: 3600 },
  suggestByNetwork: { max: 40, window: 600 },
  suggestByParticipant: { max: 5, window: 600 },
} as const
