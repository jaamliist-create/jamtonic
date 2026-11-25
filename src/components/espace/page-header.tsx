export function PageHeader({
  title,
  intro,
  action,
}: {
  title: string
  intro?: string
  action?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="display text-4xl md:text-5xl">{title}</h1>
        {intro ? <p className="mt-2 max-w-xl text-sm text-muted">{intro}</p> : null}
      </div>
      {action}
    </header>
  )
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string
  children?: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="card border-dashed px-6 py-10 text-center">
      <p className="display text-2xl">{title}</p>
      {children ? <p className="mx-auto mt-2 max-w-md text-sm text-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
