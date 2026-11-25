import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/env'

/** Rafraîchit la session et protège /espace. La vraie barrière reste la RLS. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(env.supabaseUrl, env.supabaseKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) request.cookies.set(name, value)
        response = NextResponse.next({ request })
        for (const { name, value, options } of list) response.cookies.set(name, value, options)
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  if (!user && (path.startsWith('/espace') || path === '/definir-mot-de-passe')) {
    const url = request.nextUrl.clone()
    url.pathname = '/connexion'
    url.search = path.startsWith('/espace') ? `?next=${encodeURIComponent(path)}` : ''
    return NextResponse.redirect(url)
  }
  return response
}
