import { z } from 'zod'
import { clean } from './normalize'
import { parseDuration } from './format'
import { LEARNING_PRIORITIES, SESSION_STATUSES, SONG_STATUSES } from './types'

const text = (max: number) =>
  z
    .string({ error: 'Champ requis' })
    .transform(clean)
    .pipe(z.string().min(1, 'Champ requis').max(max, `Maximum ${max} caractères`))

const optionalText = (max: number) =>
  z
    .string()
    .optional()
    .transform((v) => (v ? clean(v) : ''))
    .pipe(z.string().max(max, `Maximum ${max} caractères`))

export const songStatusSchema = z.enum(SONG_STATUSES)
export const sessionStatusSchema = z.enum(SESSION_STATUSES)

const duration = z
  .string()
  .optional()
  .transform((v) => parseDuration(v ?? ''))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 1 && v <= 7200), {
    message: 'Durée illisible. Exemple : 3:45',
  })

const year = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? Number(v.trim()) : null))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 1900 && v <= 2100), {
    message: 'Année invalide',
  })

/** Tonalité : texte libre court (« La m », « F#m »), vide = non renseignée. */
const musicalKey = z
  .string()
  .optional()
  .transform((v) => (v ? clean(v) : ''))
  .pipe(z.string().max(20, 'Tonalité : maximum 20 caractères'))
  .transform((v) => v || null)

const bpm = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? Number(v.trim()) : null))
  .refine((v) => v === null || (Number.isInteger(v) && v >= 20 && v <= 400), {
    message: 'BPM invalide (entre 20 et 400)',
  })

const linkSchema = z.object({
  label: z.string().transform(clean).pipe(z.string().max(60)),
  url: z
    .string()
    .trim()
    .max(500)
    .refine((u) => /^https?:\/\//i.test(u), 'Le lien doit commencer par http:// ou https://'),
})

const label = z.string().transform(clean).pipe(z.string().min(1).max(40))

export const songSchema = z.object({
  title: text(200),
  artist: text(200),
  status: songStatusSchema,
  learning_priority: z
    .string()
    .optional()
    .transform((v) => (v ? v : null))
    .pipe(z.enum(LEARNING_PRIORITIES).nullable()),
  duration_seconds: duration,
  year,
  musical_key: musicalKey,
  bpm,
  notes: z.string().max(20000, 'Notes trop longues').optional().default(''),
  links: z.array(linkSchema).max(10),
  genres: z.array(label).max(12),
  tags: z.array(label).max(20),
})
export type SongInput = z.infer<typeof songSchema>

export const proposeSchema = z.object({ title: text(200), artist: text(200) })

export const playlistSchema = z.object({ name: text(80), description: optionalText(500) })

export const sessionSchema = z.object({
  name: text(100),
  venue: optionalText(120),
  starts_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise'),
  starts_at: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : null))
    .refine((v) => v === null || /^\d{2}:\d{2}(:\d{2})?$/.test(v), 'Heure invalide'),
  listed: z.boolean(),
  voting_open: z.boolean(),
  max_votes_per_participant: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? Number(v.trim()) : null))
    .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 100), 'Entre 1 et 100'),
})

export const suggestionSchema = z.object({ title: text(120), artist: text(120) })

export const profileSchema = z.object({ display_name: text(60), instrument: optionalText(60) })

export const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email('Courriel invalide')),
  display_name: text(60),
})

export const passwordSchema = z
  .string()
  .min(10, 'Au moins 10 caractères')
  .max(72, 'Maximum 72 caractères')

export const uuidSchema = z.uuid()

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Données invalides'
}
