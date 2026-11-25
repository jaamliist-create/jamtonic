import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus } from 'lucide-react'
import { CatalogueList } from '@/components/espace/catalogue-list'
import { PageHeader } from '@/components/espace/page-header'
import { listSongs } from '@/lib/data/catalogue'
import { isSongStatus } from '@/lib/domain/types'
import { requireMember } from '@/lib/security/member'

export const metadata: Metadata = { title: 'Catalogue' }

export default async function CataloguePage({
  searchParams,
}: {
  searchParams: Promise<{ statut?: string }>
}) {
  await requireMember()
  const { statut } = await searchParams
  const songs = await listSongs()

  return (
    <>
      <PageHeader
        title="Catalogue"
        intro="Toutes nos tunes, peu importe où elles en sont."
        action={
          <Link href="/espace/catalogue/nouveau" className="btn btn-primary">
            <Plus size={18} aria-hidden /> Ajouter une tune
          </Link>
        }
      />
      <CatalogueList songs={songs} initialStatuses={isSongStatus(statut) ? [statut] : []} />
    </>
  )
}
