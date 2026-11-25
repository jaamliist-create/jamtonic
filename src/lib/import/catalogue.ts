/**
 * Analyse d'un export CSV du Google Sheets « Setlist disponible ».
 * Fonctions pures (aucun accès à la base) : testables et réutilisables.
 *
 * Principes :
 *  - ne jamais inventer une information manquante ;
 *  - ne jamais deviner un statut à partir d'une catégorie ;
 *  - signaler tout ce qui est ambigu au lieu de trancher en silence.
 */
import { clean, normalize } from '../domain/normalize.ts'
import { parseDuration } from '../domain/format.ts'

export const STATUS_BY_LABEL: Record<string, string> = {
  'a decouvrir': 'a_decouvrir',
  'a apprendre': 'a_apprendre',
  'en cours': 'en_cours',
  'a reviser': 'a_reviser',
  maitrise: 'maitrise',
  maitrisee: 'maitrise',
}

/** Analyseur CSV minimal : guillemets, virgules et retours de ligne dans les cellules. */
export function parseCsv(text: string, delimiter = ','): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  const src = text.replace(/^﻿/, '')
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"'
        i++
      } else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === delimiter) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else cell += c
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell)
    rows.push(row)
  }
  return rows
}

const HEADERS = {
  title: ['titre', 'title', 'chanson', 'tune', 'morceau', 'piece', 'song'],
  artist: ['artiste', 'artist', 'groupe', 'interprete', 'band'],
  category: ['categorie', 'category', 'genre', 'style', 'section', 'type'],
  status: ['statut', 'status', 'etat'],
  duration: ['duree', 'duration', 'temps'],
  year: ['annee', 'year'],
} as const

type Field = keyof typeof HEADERS
export type Columns = Partial<Record<Field, number>>

/** Trouve la ligne d'en-têtes (dans les 10 premières lignes) et la position des colonnes. */
export function detectColumns(rows: string[][]): { headerIndex: number; columns: Columns } | null {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const columns: Columns = {}
    rows[i]?.forEach((cell, col) => {
      const norm = normalize(cell)
      for (const field of Object.keys(HEADERS) as Field[]) {
        if (columns[field] === undefined && (HEADERS[field] as readonly string[]).includes(norm)) {
          columns[field] = col
        }
      }
    })
    if (columns.title !== undefined && columns.artist !== undefined) {
      return { headerIndex: i, columns }
    }
  }
  return null
}

export type ImportEntry = {
  line: number
  title: string
  artist: string
  category: string | null
  /** Statut lu dans une colonne « Statut » reconnue. Jamais déduit de la catégorie. */
  status: string | null
  duration_seconds: number | null
  year: number | null
}

export type ImportIssue = { line: number; level: 'erreur' | 'attention'; message: string }

export type Analysis = {
  entries: ImportEntry[]
  issues: ImportIssue[]
  categories: string[]
}

export function analyse(
  rows: string[][],
  options: { columns?: Columns; headerIndex?: number; defaultCategory?: string | null } = {},
): Analysis {
  const issues: ImportIssue[] = []
  const detected =
    options.columns !== undefined
      ? { headerIndex: options.headerIndex ?? -1, columns: options.columns }
      : detectColumns(rows)

  if (!detected || detected.columns.title === undefined || detected.columns.artist === undefined) {
    return {
      entries: [],
      categories: [],
      issues: [
        {
          line: 1,
          level: 'erreur',
          message:
            'Colonnes « Titre » et « Artiste » introuvables. Ajoute une ligne d’en-têtes ou précise --colonnes titre=1,artiste=2.',
        },
      ],
    }
  }

  const { columns, headerIndex } = detected
  const at = (row: string[], field: Field) =>
    columns[field] === undefined ? '' : clean(row[columns[field]] ?? '')

  const entries: ImportEntry[] = []
  const seen = new Map<string, number>()
  let section: string | null = options.defaultCategory ?? null

  rows.forEach((row, index) => {
    const line = index + 1
    if (index <= headerIndex) return
    const filled = row.map((c) => clean(c)).filter(Boolean)
    if (filled.length === 0) return

    const title = at(row, 'title')
    const artist = at(row, 'artist')

    // Une ligne avec une seule cellule remplie et pas d'artiste : titre de section
    // (ex. « Rock », « À apprendre ») qui s'applique aux lignes suivantes.
    if (filled.length === 1 && !artist && columns.category === undefined) {
      section = filled[0] ?? null
      issues.push({
        line,
        level: 'attention',
        message: `« ${section} » est lu comme un titre de section (catégorie des lignes suivantes). Si c’est une tune, il lui manque son artiste.`,
      })
      return
    }

    if (!title || !artist) {
      issues.push({
        line,
        level: 'erreur',
        message: `Ligne ignorée : ${!title ? 'titre' : 'artiste'} manquant (« ${filled.join(' | ')} »). Rien n’est inventé.`,
      })
      return
    }

    const key = `${normalize(title)}|${normalize(artist)}`
    const first = seen.get(key)
    if (first !== undefined) {
      issues.push({
        line,
        level: 'attention',
        message: `Doublon de la ligne ${first} ignoré : « ${title} — ${artist} ».`,
      })
      return
    }
    seen.set(key, line)

    const rawStatus = at(row, 'status')
    const status = rawStatus ? (STATUS_BY_LABEL[normalize(rawStatus)] ?? null) : null
    if (rawStatus && !status) {
      issues.push({
        line,
        level: 'attention',
        message: `Statut « ${rawStatus} » non reconnu pour « ${title} » : à préciser dans la correspondance.`,
      })
    }

    const rawDuration = at(row, 'duration')
    let duration = rawDuration ? parseDuration(rawDuration) : null
    if (duration !== null && (!Number.isFinite(duration) || duration < 1 || duration > 7200)) {
      issues.push({ line, level: 'attention', message: `Durée « ${rawDuration} » illisible pour « ${title} » : laissée vide.` })
      duration = null
    }

    const rawYear = at(row, 'year')
    let year: number | null = rawYear ? Number(rawYear) : null
    if (year !== null && (!Number.isInteger(year) || year < 1900 || year > 2100)) {
      issues.push({ line, level: 'attention', message: `Année « ${rawYear} » illisible pour « ${title} » : laissée vide.` })
      year = null
    }

    entries.push({
      line,
      title,
      artist,
      category: (columns.category !== undefined ? at(row, 'category') : section) || null,
      status,
      duration_seconds: duration,
      year,
    })
  })

  const categories = [...new Set(entries.flatMap((e) => e.category ?? []))]
  return { entries, issues, categories }
}

export type Mapping = {
  /** Statut appliqué aux tunes sans statut explicite. null = refuser d'importer ces tunes. */
  defaultStatus: string | null
  categories: Record<string, { genre?: string | null; tag?: string | null; status?: string | null }>
}

export type ResolvedEntry = ImportEntry & { finalStatus: string; genre: string | null; tag: string | null }

const VALID_STATUSES = new Set(Object.values(STATUS_BY_LABEL))

/** Applique la correspondance écrite par le band. Sans statut explicite, la tune est refusée. */
export function resolve(
  entries: ImportEntry[],
  mapping: Mapping,
): { ready: ResolvedEntry[]; unresolved: ImportIssue[] } {
  const ready: ResolvedEntry[] = []
  const unresolved: ImportIssue[] = []
  const byCategory = new Map(Object.entries(mapping.categories).map(([k, v]) => [normalize(k), v]))

  for (const entry of entries) {
    const rule = entry.category ? byCategory.get(normalize(entry.category)) : undefined
    const status = entry.status ?? rule?.status ?? mapping.defaultStatus
    if (!status || !VALID_STATUSES.has(status)) {
      unresolved.push({
        line: entry.line,
        level: 'erreur',
        message: `Aucun statut décidé pour « ${entry.title} — ${entry.artist} » (catégorie : ${entry.category ?? 'aucune'}).`,
      })
      continue
    }
    ready.push({ ...entry, finalStatus: status, genre: rule?.genre ?? null, tag: rule?.tag ?? null })
  }
  return { ready, unresolved }
}
