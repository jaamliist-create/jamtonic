import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/espace/page-header'
import { SongForm } from '@/components/espace/song-form'
import { listLabels } from '@/lib/data/catalogue'
import { requireMember } from '@/lib/security/member'

export const metadata: Metadata = { title: 'Ajouter une tune' }

export default async function NewSongPage() {
  await requireMember()
  const labels = await listLabels()
  return (
    <>
      <Link href="/espace/catalogue" className="btn btn-ghost -ml-3 mb-2">
        <ArrowLeft size={18} aria-hidden /> Catalogue
      </Link>
      <PageHeader title="Ajouter une tune" intro="Titre et artiste suffisent. Le reste peut attendre." />
      <div className="card p-5">
        <SongForm
          song={{
            title: '',
            artist: '',
            status: 'a_decouvrir',
            learning_priority: null,
            duration_seconds: null,
            year: null,
            musical_key: null,
            bpm: null,
            notes: '',
            links: [],
            genres: [],
            tags: [],
          }}
          genreSuggestions={labels.genres}
          tagSuggestions={labels.tags}
        />
      </div>
    </>
  )
}
