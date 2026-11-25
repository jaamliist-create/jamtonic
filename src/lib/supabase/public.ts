import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { env } from '@/lib/env'

/** Client anonyme, sans session. Ne voit que les vues et fonctions publiques. */
export function createPublicClient() {
  return createSupabaseClient<Database>(env.supabaseUrl, env.supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
