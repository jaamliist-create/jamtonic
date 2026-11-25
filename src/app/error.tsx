'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <h1 className="display text-4xl">Oups, fausse note</h1>
        <p className="mt-3 text-muted">Quelque chose n’a pas fonctionné de notre côté.</p>
        <button type="button" onClick={reset} className="btn btn-primary mt-8">
          Réessayer
        </button>
      </div>
    </main>
  )
}
