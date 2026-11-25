import 'server-only'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { env } from '@/lib/env'

/**
 * Client service_role : contourne la RLS. Serveur seulement (import 'server-only').
 * Utilisé pour les écritures du public (votes, suggestions) et les invitations.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) {
    throw new Error('SUPABASE_SECRET_KEY manquante : voir .env.example')
  }
  return createSupabaseClient<Database>(env.supabaseUrl, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
