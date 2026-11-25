'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inviteMember, setMemberActive, updateProfile } from '@/lib/actions/members'
import { FormMessage, SubmitButton, useActionForm } from '@/components/ui/form'

export function ProfileForm({ displayName, instrument }: { displayName: string; instrument: string }) {
  const { state, onSubmit, pending } = useActionForm(updateProfile, null)
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="display_name">
            Mon nom dans le band
          </label>
          <input id="display_name" name="display_name" required maxLength={60} defaultValue={displayName} className="field" />
        </div>
        <div>
          <label className="label" htmlFor="instrument">
            Mon instrument (facultatif)
          </label>
          <input id="instrument" name="instrument" maxLength={60} defaultValue={instrument} className="field" />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pending={pending} className="btn btn-secondary">Enregistrer</SubmitButton>
        <FormMessage state={state} />
      </div>
    </form>
  )
}

export function InviteForm() {
  const { state, onSubmit, pending } = useActionForm(inviteMember, null)
  const ref = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (state?.ok) ref.current?.reset()
  }, [state])
  return (
    <form ref={ref} onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
        <input name="display_name" required maxLength={60} placeholder="Prénom" aria-label="Prénom" className="field" />
        <input name="email" type="email" required placeholder="Courriel" aria-label="Courriel" className="field" />
        <SubmitButton pending={pending}>Inviter</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  )
}

export function MemberAccessButton({ memberId, active }: { memberId: string; active: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  return (
    <>
      <button
        type="button"
        disabled={pending}
        className={active ? 'btn btn-danger btn-sm' : 'btn btn-secondary btn-sm'}
        onClick={() =>
          startTransition(async () => {
            const res = await setMemberActive(memberId, !active)
            if (res.ok) router.refresh()
            else setError(res.error)
          })
        }
      >
        {active ? 'Désactiver' : 'Réactiver'}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-danger">
          {error}
        </span>
      ) : null}
    </>
  )
}
