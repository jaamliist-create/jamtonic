/**
 * Crée le premier compte : le propriétaire technique. Les autres membres sont ensuite
 * invités depuis /espace/groupe. Il n'existe aucune inscription publique.
 *
 *   npm run owner:create -- <courriel> "<Prénom>" [fichier-env]
 *
 * Le mot de passe est lu dans la variable OWNER_PASSWORD si elle existe ;
 * sinon un mot de passe temporaire est généré et affiché une seule fois.
 */
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

const [email, name, envFile = '.env.local'] = process.argv.slice(2)
if (!email || !name) {
  console.error('Usage : npm run owner:create -- <courriel> "<Prénom>" [fichier-env]')
  process.exit(1)
}

config({ path: envFile, quiet: true })
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) {
  console.error(`NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY requis dans ${envFile}`)
  process.exit(1)
}

const supabase = createClient(url, secret, { auth: { persistSession: false } })
const generated = !process.env.OWNER_PASSWORD
const password = process.env.OWNER_PASSWORD ?? randomBytes(12).toString('base64url')

const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true })
if (error || !data.user) {
  console.error(`Création impossible : ${error?.message}`)
  process.exit(1)
}

const { error: profileError } = await supabase
  .from('profiles')
  .upsert({ id: data.user.id, display_name: name, is_owner: true, is_active: true })
if (profileError) {
  console.error(`Compte créé, mais profil impossible : ${profileError.message}`)
  process.exit(1)
}

console.log(`Propriétaire technique créé : ${email} (${url})`)
if (generated) {
  console.log(`Mot de passe temporaire : ${password}`)
  console.log('Change-le dès la première connexion (« Mot de passe oublié ? » sur /connexion).')
}
