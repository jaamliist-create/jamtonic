'use client'

import { startTransition, useActionState, type FormEvent } from 'react'
import type { ActionResult } from '@/lib/domain/types'

/**
 * Branche un formulaire sur une Server Action sans passer par `<form action>` :
 * React vide alors les champs après CHAQUE envoi, même en cas d'erreur
 * (un doublon refusé effaçait le titre saisi). Ici, la saisie reste en place ;
 * chaque formulaire décide lui-même quand se vider.
 */
export function useActionForm<S>(
  action: (prev: Awaited<S>, formData: FormData) => S | Promise<S>,
  initial: Awaited<S>,
) {
  const [state, dispatch, pending] = useActionState(action, initial)
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => dispatch(formData))
  }
  return { state, onSubmit, pending }
}

export function SubmitButton({
  children,
  pending,
  className = 'btn btn-primary',
  pendingLabel = 'Un instant…',
}: {
  children: React.ReactNode
  pending: boolean
  className?: string
  pendingLabel?: string
}) {
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  )
}

/** Message de retour d'une action, annoncé aux lecteurs d'écran. */
export function FormMessage({
  state,
  children,
}: {
  state: ActionResult | null
  children?: React.ReactNode
}) {
  if (!state) return null
  if (state.ok) {
    return state.message ? (
      <p role="status" className="text-sm font-medium text-lime">
        {state.message}
      </p>
    ) : null
  }
  return (
    <p role="alert" className="text-sm font-medium text-danger">
      {state.error} {children}
    </p>
  )
}
