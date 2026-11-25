import type { Metadata } from 'next'
import { DiscoverRow, ProposeForm } from '@/components/espace/discover'
import { EmptyState, PageHeader } from '@/components/espace/page-header'
import { listDiscover } from '@/lib/data/catalogue'
import { requireMember } from '@/lib/security/member'

export const metadata: Metadata = { title: 'À découvrir' }

export default async function DiscoverPage() {
  const member = await requireMember()
  const items = await listDiscover(member.userId)

  return (
    <>
      <PageHeader
        title="À découvrir"
        intro="On propose, on vote, et on décide ensemble de ce qu’on apprend. Le vote ne change jamais un statut tout seul."
      />
      <ProposeForm />
      <div className="mt-6">
        {items.length === 0 ? (
          <EmptyState title="Aucune proposition pour l’instant">
            Une tune entendue à la radio ? Propose-la juste au-dessus.
          </EmptyState>
        ) : (
          <ol className="space-y-2">
            {items.map((item, i) => (
              <DiscoverRow key={`${item.id}-${item.votes}-${item.voted}`} item={item} rank={i + 1} />
            ))}
          </ol>
        )}
      </div>
    </>
  )
}
