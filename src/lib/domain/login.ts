/**
 * Connexion par identifiant. Supabase Auth exige un courriel : un compte créé avec un
 * identifiant (« florian ») y est rangé sous `florian@<LOGIN_DOMAIN>`. Ce domaine ne
 * reçoit aucun courriel, donc ces comptes n'ont pas de « Mot de passe oublié ? » :
 * leur mot de passe se change avec `npm run account`.
 *
 * Fichier sans dépendance : il est aussi importé par scripts/account.mts.
 */
export const LOGIN_DOMAIN = 'comptes.jamtonic.test'

/**
 * Clé de `app_metadata` (modifiable par service_role seulement) : vraie tant que le membre
 * utilise le mot de passe qu'on lui a transmis. L'espace reste fermé jusqu'à ce qu'il le change.
 */
export const MUST_CHANGE_PASSWORD = 'must_change_password'

const IDENTIFIER = /^[a-z0-9][a-z0-9._-]{1,29}$/

/** Identifiant normalisé, ou `null` s'il n'est pas valide (2 à 30 caractères : a-z, 0-9, . _ -). */
export function parseIdentifier(input: string): string | null {
  const id = input.trim().toLowerCase()
  return IDENTIFIER.test(id) ? id : null
}

/** Ce que la personne tape à la connexion (identifiant ou courriel) → courriel Supabase. */
export function loginToEmail(input: string): string | null {
  const value = input.trim().toLowerCase()
  if (value.includes('@')) return value
  const id = parseIdentifier(value)
  return id ? `${id}@${LOGIN_DOMAIN}` : null
}

/** Courriel Supabase → ce qu'on affiche : l'identifiant s'il y en a un, sinon le courriel. */
export function emailToLogin(email: string): string {
  const suffix = `@${LOGIN_DOMAIN}`
  return email.endsWith(suffix) ? email.slice(0, -suffix.length) : email
}
