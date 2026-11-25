import { NextResponse, type NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

const TYPES: EmailOtpType[] = ['invite', 'recovery', 'email', 'magiclink']

/** Arrivée depuis un courriel (invitation ou réinitialisation) : échange le jeton. */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextParam = searchParams.get('next') ?? ''
  // Chemins internes connus seulement (pas de redirection ouverte).
  const next = nextParam === '/definir-mot-de-passe' || nextParam.startsWith('/espace') ? nextParam : '/espace'

  const url = request.nextUrl.clone()
  url.search = ''

  if (tokenHash && type && TYPES.includes(type)) {
    const supabase = await createClient()
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      url.pathname = next
      return NextResponse.redirect(url)
    }
  }
  url.pathname = '/connexion'
  url.search = '?erreur=lien'
  return NextResponse.redirect(url)
}
