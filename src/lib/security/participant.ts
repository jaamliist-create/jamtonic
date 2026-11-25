import 'server-only'
import { randomUUID } from 'node:crypto'
import { cookies, headers } from 'next/headers'
import { hashNetwork, signParticipant, verifyParticipant } from './token'

/**
 * Identifiant anonyme d'un spectateur : UUID aléatoire signé, dans un témoin httpOnly
 * posé par le serveur au premier vote ou à la première proposition.
 * C'est une protection raisonnable contre les votes multiples, pas une garantie :
 * effacer ses témoins donne un nouvel identifiant (d'où la limite de fréquence).
 */
const COOKIE = 'jt_p'

function secret(): string {
  const s = process.env.JT_SECRET
  if (!s || s.length < 32) throw new Error('JT_SECRET manquant ou trop court (voir .env.example)')
  return s
}

/** Lecture seule (Server Components et actions). */
export async function readParticipant(): Promise<string | null> {
  const store = await cookies()
  return verifyParticipant(store.get(COOKIE)?.value, secret())
}

/** Crée et pose l'identifiant. À appeler depuis une Server Action seulement. */
export async function issueParticipant(): Promise<string> {
  const id = randomUUID()
  const store = await cookies()
  store.set(COOKIE, signParticipant(id, secret()), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 180,
  })
  return id
}

/** Empreinte de l'adresse réseau de la requête ; change chaque jour. */
export async function networkKey(): Promise<string> {
  const h = await headers()
  const ip =
    h.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'inconnue'
  return hashNetwork(ip, new Date().toISOString().slice(0, 10), secret())
}
