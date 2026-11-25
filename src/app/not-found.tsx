import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div>
        <p className="display text-7xl text-tonic">404</p>
        <h1 className="display mt-3 text-3xl">Cette page a pris une pause</h1>
        <p className="mt-3 text-muted">Le lien est peut-être périmé, ou la soirée est terminée.</p>
        <Link href="/" className="btn btn-primary mt-8">
          Retour à l’accueil
        </Link>
      </div>
    </main>
  )
}
