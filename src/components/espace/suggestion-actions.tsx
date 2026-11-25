'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createSongFromSuggestion, setSuggestionDismissed } from '@/lib/actions/suggestions'
import type { ActionResult, SuggestionStatus } from '@/lib/domain/types'

export function SuggestionActions({
  suggestionId,
  status,
  existingSongId,
}: {
  suggestionId: string
  status: SuggestionStatus
  existingSongId: string | null
}) {
  const [pending, startTransition] = useTransition()
  const [result, setResult] = useState<ActionResult | null>(null)

  const run = (fn: () => Promise<ActionResult>) =>
    startTransition(async () => setResult(await fn()))

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {status === 'nouvelle' ? (
        <>
          <button
            type="button"
            disabled={pending}
            className="btn btn-primary btn-sm"
            onClick={() => run(() => createSongFromSuggestion(suggestionId))}
          >
            {existingSongId ? 'Rattacher à la tune existante' : 'Créer la tune (À découvrir)'}
          </button>
          <button
            type="button"
            disabled={pending}
            className="btn btn-secondary btn-sm"
            onClick={() => run(() => setSuggestionDismissed(suggestionId, true))}
          >
            Écarter
          </button>
        </>
      ) : null}
      {status === 'ecartee' ? (
        <button
          type="button"
          disabled={pending}
          className="btn btn-secondary btn-sm"
          onClick={() => run(() => setSuggestionDismissed(suggestionId, false))}
        >
          Remettre en attente
        </button>
      ) : null}
      {existingSongId ? (
        <Link href={`/espace/catalogue/${existingSongId}`} className="btn btn-ghost btn-sm underline underline-offset-4">
          Voir la tune
        </Link>
      ) : null}
      {result ? (
        <p role={result.ok ? 'status' : 'alert'} className={`text-sm ${result.ok ? 'text-lime' : 'text-danger'}`}>
          {result.ok ? result.message : result.error}
        </p>
      ) : null}
    </div>
  )
}
