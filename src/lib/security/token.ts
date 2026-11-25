import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Signature de l'identifiant anonyme d'un spectateur (fonctions pures, testables).
 * Jeton = « <uuid>.<hmac> ». Sans la clé du serveur, impossible de fabriquer
 * un identifiant valide ni d'emprunter celui d'un autre.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

export function signParticipant(id: string, key: string): string {
  const sig = createHmac('sha256', key).update(`participant:${id}`).digest('base64url')
  return `${id}.${sig}`
}

export function verifyParticipant(token: string | undefined, key: string): string | null {
  if (!token) return null
  const dot = token.indexOf('.')
  if (dot < 0) return null
  const id = token.slice(0, dot)
  if (!UUID_RE.test(id)) return null
  const expected = Buffer.from(signParticipant(id, key))
  const given = Buffer.from(token)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
  return id
}

/** Empreinte d'une adresse réseau pour un jour donné. L'adresse n'est jamais stockée. */
export function hashNetwork(ip: string, day: string, key: string): string {
  return createHmac('sha256', key).update(`net:${day}:${ip}`).digest('base64url').slice(0, 32)
}
