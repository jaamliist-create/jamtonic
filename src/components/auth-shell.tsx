import Image from 'next/image'
import Link from 'next/link'

export function AuthShell({
  title,
  intro,
  children,
}: {
  title: string
  intro?: string
  children: React.ReactNode
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[radial-gradient(ellipse_at_top,var(--jt-night),var(--jt-night-deep)_70%)] px-5 py-10">
      <div className="w-full max-w-sm">
        <Link href="/" aria-label="Accueil JamTonic" className="mx-auto block w-48">
          <Image src="/brand/logo.png" alt="JamTonic" width={1200} height={576} priority />
        </Link>
        <div className="card mt-8 p-6 shadow-[var(--jt-shadow)]">
          <h1 className="display text-3xl">{title}</h1>
          {intro ? <p className="mt-2 text-sm text-muted">{intro}</p> : null}
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </main>
  )
}
