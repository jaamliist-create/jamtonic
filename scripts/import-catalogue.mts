/**
 * Import du catalogue depuis un export CSV du Google Sheets « Setlist disponible ».
 *
 * 1. Dans Google Sheets : Fichier > Télécharger > Valeurs séparées par des virgules (.csv)
 *    (un fichier par onglet), puis déposer le ou les fichiers dans import/.
 * 2. Analyse (n'écrit rien dans la base) :
 *      npm run import:catalogue -- import/setlist.csv
 *    Produit un rapport et, la première fois, import/correspondance.json à compléter.
 * 3. Compléter import/correspondance.json : pour chaque catégorie du tableur, décider
 *    le genre, l'étiquette et SURTOUT le statut. Rien n'est deviné.
 * 4. Application :
 *      npm run import:catalogue -- import/setlist.csv --appliquer
 *
 * Options :
 *   --categorie "Rock"        catégorie des lignes d'un fichier qui n'en indique pas (un onglet = une catégorie)
 *   --colonnes titre=1,artiste=2[,categorie=3,statut=4,duree=5,annee=6]   si pas de ligne d'en-têtes
 *   --correspondance <fichier>   (défaut : import/correspondance.json)
 *   --env <fichier>              (défaut : .env.local)
 *   --appliquer                  écrit dans la base
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { normalize } from '../src/lib/domain/normalize.ts'
import {
  analyse,
  parseCsv,
  resolve,
  type Columns,
  type ImportEntry,
  type ImportIssue,
  type Mapping,
} from '../src/lib/import/catalogue.ts'

const args = process.argv.slice(2)
const flag = (name: string) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : undefined
}
const files = args.filter((a, i) => !a.startsWith('--') && !args[i - 1]?.match(/^--(categorie|colonnes|correspondance|env)$/))
const apply = args.includes('--appliquer')
const mappingPath = flag('--correspondance') ?? 'import/correspondance.json'

if (files.length === 0) {
  console.error('Usage : npm run import:catalogue -- <fichier.csv> [--appliquer]  (détails en tête du script)')
  process.exit(1)
}

const FIELD_ALIASES: Record<string, keyof Columns> = {
  titre: 'title',
  artiste: 'artist',
  categorie: 'category',
  statut: 'status',
  duree: 'duration',
  annee: 'year',
}
let columns: Columns | undefined
const rawColumns = flag('--colonnes')
if (rawColumns) {
  columns = {}
  for (const part of rawColumns.split(',')) {
    const [name, position] = part.split('=')
    const field = FIELD_ALIASES[normalize(name ?? '')]
    if (!field || !Number.isInteger(Number(position)) || Number(position) < 1) {
      console.error(`--colonnes invalide : « ${part} »`)
      process.exit(1)
    }
    columns[field] = Number(position) - 1
  }
}

// ---------------------------------------------------------------- analyse
const entries: (ImportEntry & { file: string })[] = []
const issues: (ImportIssue & { file: string })[] = []
const seen = new Map<string, string>()

for (const file of files) {
  const text = readFileSync(file, 'utf8')
  const delimiter = (text.split('\n')[0] ?? '').split(';').length > (text.split('\n')[0] ?? '').split(',').length ? ';' : ','
  const result = analyse(parseCsv(text, delimiter), { columns, defaultCategory: flag('--categorie') ?? null })
  for (const issue of result.issues) issues.push({ ...issue, file })
  for (const entry of result.entries) {
    const key = `${normalize(entry.title)}|${normalize(entry.artist)}`
    const first = seen.get(key)
    if (first) {
      issues.push({ file, line: entry.line, level: 'attention', message: `Doublon de ${first} ignoré : « ${entry.title} — ${entry.artist} ».` })
      continue
    }
    seen.set(key, `${file}:${entry.line}`)
    entries.push({ ...entry, file })
  }
}

const categories = [...new Set(entries.flatMap((e) => e.category ?? []))]

console.log(`\n${entries.length} tune(s) lue(s) dans ${files.length} fichier(s).`)
console.log(`Catégories trouvées : ${categories.length > 0 ? categories.join(', ') : 'aucune'}`)
for (const c of categories) {
  console.log(`  - ${c} : ${entries.filter((e) => e.category === c).length} tune(s)`)
}
const withoutCategory = entries.filter((e) => !e.category).length
if (withoutCategory > 0) console.log(`  - (sans catégorie) : ${withoutCategory} tune(s)`)

if (issues.length > 0) {
  console.log(`\n${issues.length} point(s) à vérifier :`)
  for (const i of issues) console.log(`  [${i.level}] ${i.file}:${i.line} — ${i.message}`)
}

mkdirSync('import', { recursive: true })

// ---------------------------------------------------------------- correspondance
if (!existsSync(mappingPath)) {
  const proposal: Mapping & { _aide: string } = {
    _aide:
      'Pour chaque catégorie du tableur : "genre" et "tag" sont facultatifs (null = aucun). "status" doit être l’un de : a_decouvrir, a_apprendre, en_cours, a_reviser, maitrise — ou null pour utiliser "defaultStatus". Une catégorie n’est PAS un statut : à vous de décider.',
    defaultStatus: null,
    categories: Object.fromEntries(categories.map((c) => [c, { genre: null, tag: null, status: null }])),
  }
  writeFileSync(mappingPath, `${JSON.stringify(proposal, null, 2)}\n`)
  console.log(`\nCorrespondance à compléter : ${mappingPath}`)
  console.log('Aucun statut n’est déduit des catégories. Complète ce fichier puis relance la commande.')
  process.exit(0)
}

const mapping = JSON.parse(readFileSync(mappingPath, 'utf8')) as Mapping
const { ready, unresolved } = resolve(entries, mapping)
const fileOf = new Map(entries.map((e) => [`${e.title}|${e.artist}`, e.file]))

if (unresolved.length > 0) {
  console.log(`\n${unresolved.length} tune(s) sans statut décidé (elles ne seront pas importées) :`)
  for (const u of unresolved) console.log(`  ${u.message}`)
}

// ---------------------------------------------------------------- base
config({ path: flag('--env') ?? '.env.local', quiet: true })
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const secret = process.env.SUPABASE_SECRET_KEY
if (!url || !secret) {
  console.error('\nNEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY requis (fichier --env).')
  process.exit(1)
}
const supabase = createClient(url, secret, { auth: { persistSession: false } })

const { data: existing, error: readError } = await supabase.from('songs').select('title_norm, artist_norm')
if (readError) {
  console.error(`Lecture du catalogue impossible : ${readError.message}`)
  process.exit(1)
}
const inDb = new Set(existing.map((s) => `${s.title_norm}|${s.artist_norm}`))
const fresh = ready.filter((e) => !inDb.has(`${normalize(e.title)}|${normalize(e.artist)}`))
const already = ready.length - fresh.length

console.log(`\nPrêtes à importer : ${fresh.length} · déjà au catalogue : ${already} · sans statut : ${unresolved.length}`)
const byStatus = new Map<string, number>()
for (const e of fresh) byStatus.set(e.finalStatus, (byStatus.get(e.finalStatus) ?? 0) + 1)
for (const [status, n] of byStatus) console.log(`  - ${status} : ${n}`)

const report = `import/rapport-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
writeFileSync(
  report,
  JSON.stringify({ fichiers: files, pretes: fresh, dejaAuCatalogue: already, sansStatut: unresolved, aVerifier: issues }, null, 2),
)
console.log(`Rapport détaillé : ${report}`)

if (!apply) {
  console.log('\nAnalyse seulement : rien n’a été écrit. Relis le rapport, puis relance avec --appliquer.')
  process.exit(0)
}

// ---------------------------------------------------------------- application
async function labelIds(table: 'genres' | 'tags', names: string[]) {
  const wanted = new Map(names.map((n) => [normalize(n), n]))
  const { data, error } = await supabase.from(table).select('id, name_norm')
  if (error) throw new Error(error.message)
  const ids = new Map(data.map((r) => [r.name_norm as string, r.id as string]))
  const missing = [...wanted].filter(([norm]) => !ids.has(norm)).map(([, name]) => ({ name }))
  if (missing.length > 0) {
    const created = await supabase.from(table).insert(missing).select('id, name_norm')
    if (created.error) throw new Error(created.error.message)
    for (const r of created.data) ids.set(r.name_norm as string, r.id as string)
  }
  return ids
}

const genreIds = await labelIds('genres', [...new Set(fresh.flatMap((e) => e.genre ?? []))])
const tagIds = await labelIds('tags', [...new Set(fresh.flatMap((e) => e.tag ?? []))])

let imported = 0
for (const e of fresh) {
  const { data, error } = await supabase
    .from('songs')
    .insert({
      title: e.title,
      artist: e.artist,
      status: e.finalStatus,
      duration_seconds: e.duration_seconds,
      year: e.year,
    })
    .select('id')
    .single()
  if (error) {
    console.log(`  [erreur] ${fileOf.get(`${e.title}|${e.artist}`)}:${e.line} « ${e.title} » : ${error.message}`)
    continue
  }
  imported++
  const genre = e.genre ? genreIds.get(normalize(e.genre)) : undefined
  if (genre) await supabase.from('song_genres').insert({ song_id: data.id, genre_id: genre })
  const tag = e.tag ? tagIds.get(normalize(e.tag)) : undefined
  if (tag) await supabase.from('song_tags').insert({ song_id: data.id, tag_id: tag })
}

console.log(`\n${imported} tune(s) importée(s). Vérifie le résultat dans /espace/catalogue.`)
