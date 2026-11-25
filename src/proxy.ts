import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/proxy'

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

// Seules les routes qui ont besoin de la session passent par le proxy.
// Le site public reste sans témoin de session.
export const config = {
  matcher: ['/espace/:path*', '/connexion', '/definir-mot-de-passe', '/auth/:path*'],
}
