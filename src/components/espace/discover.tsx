'use client'

import { useOptimistic, useRef, useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { ThumbsUp } from 'lucide-react'
import { proposeSong, setInternalVote, setSongStatus } from '@/lib/actions/songs'
import { FormMessage, SubmitButton, useActionForm } from '@/components/ui/form'
import type { DiscoverItem } from '@/lib/data/catalogue'

export function ProposeForm() {
  const { state, onSubmit, pending } = useActionForm(proposeSong, null)
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) formRef.current?.reset()
  }, [state])

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card space-y-3 p-4">
      <h2 className="display text-2xl">Propose une tune</h2>
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input name="title" required maxLength={200} placeholder="Titre" aria-label="Titre" className="field" />
        <input name="artist" required maxLength={200} placeholder="Artiste" aria-label="Artiste" className="field" />
        <SubmitButton pending={pending}>Proposer</SubmitButton>
      </div>
      <FormMessage state={state}>
        {state && !state.ok && state.existingId ? (
          <Link href={`/espace/catalogue/${state.existingId}`} className="underline underline-offset-4">
            Voir la tune
          </Link>
        ) : null}
      </FormMessage>
    </form>
  )
}

export function DiscoverRow({ item, rank }: { item: DiscoverItem; rank: number }) {
  const [vote, setVote] = useOptimistic({ voted: item.voted, votes: item.votes })
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const toggle = () =>
    startTransition(async () => {
      setError(null)
      const next = !vote.voted
      setVote({ voted: next, votes: vote.votes + (next ? 1 : -1) })
      const res = await setInternalVote(item.id, next)
      if (!res.ok) setError(res.error)
    })

  const promote = () =>
    startTransition(async () => {
      setError(null)
      const res = await setSongStatus(item.id, 'a_apprendre')
      if (!res.ok) setError(res.error)
    })

  return (
    <li className="card p-4">
      <div className="flex items-center gap-3">
        <span className="display w-7 text-center text-2xl text-muted" aria-hidden>
          {rank}
        </span>
        <Link href={`/espace/catalogue/${item.id}`} className="min-w-0 flex-1 py-1">
          <p className="truncate font-bold">{item.title}</p>
          <p className="truncate text-sm text-muted">{item.artist}</p>
        </Link>
        <button
          type="button"
          data-testid="discover-vote"
          aria-pressed={vote.voted}
          aria-label={vote.voted ? `Retirer mon vote pour ${item.title}` : `Voter pour ${item.title}`}
          disabled={pending}
          onClick={toggle}
          className={`flex min-h-12 min-w-16 items-center justify-center gap-2 rounded-full border px-4 font-bold transition-colors ${
            vote.voted ? 'border-tonic bg-tonic text-night-ink' : 'border-line bg-surface text-cream'
          }`}
        >
          <ThumbsUp size={18} aria-hidden />
          <span>{vote.votes}</span>
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-10">
        <p className="text-xs text-muted">{vote.votes === 0 ? 'Pas encore de vote' : null}</p>
        <button
          type="button"
          data-testid="discover-promote"
          disabled={pending}
          onClick={promote}
          className="btn btn-secondary btn-sm"
        >
          Passer à apprendre
        </button>
      </div>
      {error ? (
        <p role="alert" className="mt-2 pl-10 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </li>
  )
}
