function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Variable d'environnement manquante : ${name} (voir .env.example)`)
  return value
}

export const env = {
  get supabaseUrl() {
    return required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  },
  get supabaseKey() {
    return required(
      'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    )
  },
  get siteUrl() {
    return (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  },
}

/** Liens affichés seulement s'ils sont configurés. Rien n'est inventé. */
export const site = {
  socials: [
    { label: 'Facebook', url: process.env.NEXT_PUBLIC_SOCIAL_FACEBOOK },
    { label: 'Instagram', url: process.env.NEXT_PUBLIC_SOCIAL_INSTAGRAM },
    { label: 'YouTube', url: process.env.NEXT_PUBLIC_SOCIAL_YOUTUBE },
  ].filter((s): s is { label: string; url: string } => Boolean(s.url)),
  contactEmail: process.env.NEXT_PUBLIC_CONTACT_EMAIL || null,
}
