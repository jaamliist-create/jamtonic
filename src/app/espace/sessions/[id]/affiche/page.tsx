import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { ArrowLeft } from 'lucide-react'
import { PrintButton } from '@/components/espace/print-button'
import { env } from '@/lib/env'
import { SIGNATURE } from '@/lib/domain/copy'
import { uuidSchema } from '@/lib/domain/schemas'
import { requireMember } from '@/lib/security/member'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Affiche QR' }

export default async function AffichePage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember()
  const { id } = await params
  if (!uuidSchema.safeParse(id).success) notFound()

  const supabase = await createClient()
  const { data: session } = await supabase
    .from('concert_sessions')
    .select('id, slug, name')
    .eq('id', id)
    .maybeSingle()
  if (!session) notFound()

  const publicUrl = `${env.siteUrl}/s/${session.slug}`
  const qrSvg = await QRCode.toString(publicUrl, {
    type: 'svg',
    margin: 0,
    errorCorrectionLevel: 'H',
    color: { dark: '#021A24', light: '#FFFFFF' },
  })

  return (
    <>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/espace/sessions/${session.id}`} className="btn btn-ghost -ml-3">
          <ArrowLeft size={18} aria-hidden /> {session.name}
        </Link>
        <PrintButton />
      </div>

      {/* Affiche sur fond blanc : économe en encre, lisible dans un bar. */}
      <article className="mx-auto max-w-md rounded-3xl bg-white px-8 py-10 text-center text-[#021A24] print:max-w-none print:rounded-none print:py-16">
        <div className="mx-auto w-64 rounded-3xl bg-[#063B50] px-6 py-4">
          <Image src="/brand/logo.png" alt="JamTonic" width={1200} height={576} priority />
        </div>
        <p className="display mt-8 text-5xl leading-none">
          {SIGNATURE[0]}
          <br />
          {SIGNATURE[1]}
        </p>
        <p className="mt-4 text-lg font-semibold">Scanne et vote pour tes tunes préférées</p>
        <div
          role="img"
          aria-label={`QR code vers ${publicUrl}`}
          className="mx-auto mt-8 size-64 [&>svg]:size-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <p className="mt-6 break-all font-mono text-sm">{publicUrl.replace(/^https?:\/\//, '')}</p>
        <p className="mt-2 text-sm">Pas de compte, pas d’application à installer.</p>
      </article>
    </>
  )
}
