/**
 * Charge le catalogue initial (supabase/seed.sql) dans la base LOCALE, puis affiche
 * les totaux pour vérification. Réexécutable : rien n'est dupliqué ni écrasé.
 *
 *   npm run seed:catalogue
 *
 * Base distante (projet lié avec `npx supabase link`) :
 *   npx supabase db push --include-seed
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const CONTAINER = 'supabase_db_jamtonic'
const psql = (args, input) =>
  spawnSync('docker', ['exec', '-i', CONTAINER, 'psql', '-U', 'postgres', '-d', 'postgres', '-v', 'ON_ERROR_STOP=1', ...args], {
    input,
    encoding: 'utf8',
  })

const seed = psql(['-q', '-f', '-'], readFileSync('supabase/seed.sql', 'utf8'))
if (seed.status !== 0) {
  console.error(seed.stderr || seed.error?.message || 'Échec du seed.')
  console.error('La base locale tourne-t-elle ? (npm run supabase:start)')
  process.exit(1)
}

const check = psql([
  '-c',
  `select
     count(*) filter (where archived_at is null)                                   as "tunes",
     count(*) filter (where status = 'maitrise' and archived_at is null)            as "maîtrisées",
     count(*) filter (where status = 'a_reviser' and archived_at is null)           as "à réviser",
     count(*) filter (where status = 'a_apprendre' and archived_at is null)         as "à apprendre",
     count(*) filter (where learning_priority = 'urgent')                           as "urgent",
     count(*) filter (where learning_priority = 'moyen_terme')                      as "moyen terme",
     count(*) filter (where learning_priority = 'pour_le_fun')                      as "pour le fun",
     (select count(*) from public.public_songs)                                     as "visibles du public"
   from public.songs`,
])
console.log('Catalogue initial chargé (les tunes déjà présentes n’ont pas été touchées).\n')
console.log(check.stdout)
