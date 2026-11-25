'use client'

import { useEffect, useRef } from 'react'
import { useActionForm } from '@/components/ui/form'
import { submitSuggestion, type SuggestState } from '@/lib/actions/public'
import { SUGGEST_THANKS } from '@/lib/domain/copy'

const INITIAL: SuggestState = { status: 'idle' }

function Submit({ pending }: { pending: boolean }) {
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className="btn btn-primary w-full text-base md:w-auto md:px-8">
      {pending ? 'Envoi…' : 'Propose une tune'}
    </button>
  )
}

/** Suggestion du public : titre et artiste, rien d'autre. Aucune donnée personnelle. */
export function SuggestForm({ slug }: { slug?: string }) {
  const { state, onSubmit, pending } = useActionForm(submitSuggestion, INITIAL)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    if (state.status === 'ok') formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} onSubmit={onSubmit} data-testid="suggest-form" className="space-y-3">
      {slug ? <input type="hidden" name="slug" value={slug} /> : null}
      {/* Champ piège : invisible pour les humains, irrésistible pour les robots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Ne pas remplir
          <input name="site_web" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label" htmlFor={`sug-title-${slug ?? 'home'}`}>
            Titre
          </label>
          <input
            id={`sug-title-${slug ?? 'home'}`}
            name="title"
            required
            maxLength={120}
            autoComplete="off"
            placeholder="Le titre de la tune"
            className="field"
          />
        </div>
        <div>
          <label className="label" htmlFor={`sug-artist-${slug ?? 'home'}`}>
            Artiste
          </label>
          <input
            id={`sug-artist-${slug ?? 'home'}`}
            name="artist"
            required
            maxLength={120}
            autoComplete="off"
            placeholder="Qui la chante ?"
            className="field"
          />
        </div>
      </div>
      <Submit pending={pending} />
      {state.status === 'ok' ? (
        <p role="status" data-testid="suggest-success" className="rounded-2xl border border-lime/40 bg-lime/10 p-4 font-semibold text-cream">
          {SUGGEST_THANKS}
        </p>
      ) : null}
      {state.status === 'error' ? (
        <p role="alert" className="font-semibold text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
