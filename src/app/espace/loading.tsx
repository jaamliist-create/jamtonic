export default function EspaceLoading() {
  return (
    <div aria-busy="true" aria-label="Chargement" className="space-y-4">
      <div className="h-10 w-56 animate-pulse rounded-xl bg-surface-strong" />
      <div className="h-24 animate-pulse rounded-2xl bg-surface" />
      <div className="h-24 animate-pulse rounded-2xl bg-surface" />
      <div className="h-24 animate-pulse rounded-2xl bg-surface" />
    </div>
  )
}
