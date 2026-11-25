/**
 * Compte avec identifiant (sans courriel) : création, puis choix du mot de passe plus tard.
 *
 *   npm run account -- <identifiant> "<Nom affiché>" [--owner] [--env fichier]
 *   npm run account -- <identifiant>                  (compte existant : change le mot de passe)
 *
 * Le mot de passe est lu dans la variable ACCOUNT_PASSWORD. Sans elle, un nouveau compte
 * est créé avec un mot de passe aléatoire que personne ne connaît : la connexion reste
 * impossible tant qu'un mot de passe n'a pas été choisi.
 * Un mot de passe posé par ce script est provisoire : le membre doit le remplacer à sa
 * prochaine connexion (aucun courriel requis).
 *
 *   PowerShell : $env:ACCOUNT_PASSWORD = '...'; npm run account -- florian
 *   bash       : ACCOUNT_PASSWORD='...' npm run account -- florian
 */
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { loginToEmail, MUST_CHANGE_PASSWORD, parseIdentifier } from '../src/lib/domain/login.ts'

const USAGE = 'Usage : npm run account -- <identifiant> ["<Nom affiché>"] [--owner] [--env fichier]'

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

const args = process.argv.slice(2)
const owner = args.includes('--owner')
const envIndex = args.indexOf('--env')
const envFile = envIndex >= 0 ? args[envIndex + 1] : '.env.local'
if (!envFile) fail(USAGE)
const positional = args.filter((a, i) => !a.startsWith('--') && (envIndex < 0 || i !== envIndex + 1))
const [rawId, displayName] = positional

const identifier = rawId ? parseIdentifier(rawId) : null
const email = identifier ? loginToEmail(identifier) : null
if (!identifier || !email) fail(`Identifiant invalide (2 à 30 caractères : a-z, 0-9, . _ -).\n${USAGE}`)

config({ path: envFile, quiet: true })
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) fail(`NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY requis dans ${envFile}`)

const chosen = process.env.ACCOUNT_PASSWORD
if (chosen !== undefined && (chosen.length < 10 || chosen.length > 72)) {
  fail('ACCOUNT_PASSWORD : entre 10 et 72 caractères.')
}

// Un mot de passe posé ici est transmis au membre : il devra le remplacer à sa prochaine connexion.
const mustChange = { [MUST_CHANGE_PASSWORD]: true }

const supabase = createClient(url, secret, { auth: { persistSession: false } })

const { data: list, error: listError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
if (listError) fail(`Lecture des comptes impossible : ${listError.message}`)
const existing = list.users.find((u) => u.email === email)

if (existing) {
  if (displayName || owner) {
    console.error('Ce compte existe déjà : son nom et son rôle ne sont pas modifiés par ce script.')
  }
  if (chosen === undefined) fail(`Le compte « ${identifier} » existe déjà. Définis ACCOUNT_PASSWORD pour changer son mot de passe.`)
  const { error } = await supabase.auth.admin.updateUserById(existing.id, { password: chosen, app_metadata: mustChange })
  if (error) fail(`Mot de passe refusé : ${error.message}`)
  console.log(`Mot de passe enregistré pour « ${identifier} » (${url}). À changer à la prochaine connexion.`)
  process.exit(0)
}

if (!displayName) fail(`Le compte « ${identifier} » n'existe pas encore : le nom affiché est requis.\n${USAGE}`)

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password: chosen ?? randomBytes(32).toString('base64url'),
  email_confirm: true,
  app_metadata: chosen === undefined ? undefined : mustChange,
})
if (error || !data.user) fail(`Création impossible : ${error?.message}`)

const { error: profileError } = await supabase
  .from('profiles')
  .upsert({ id: data.user.id, display_name: displayName, is_owner: owner, is_active: true })
if (profileError) fail(`Compte créé, mais profil impossible : ${profileError.message}`)

console.log(`Compte créé : « ${identifier} » — ${displayName}${owner ? ' (propriétaire technique)' : ''} (${url})`)
console.log(
  chosen === undefined
    ? `Aucun mot de passe choisi : connexion impossible pour l'instant. Plus tard : ACCOUNT_PASSWORD puis « npm run account -- ${identifier} ».`
    : 'Mot de passe enregistré. À changer à la première connexion.',
)
