export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

/** « 3:45 », « 3m45 » ou « 225 » → secondes. null si vide, NaN si illisible. */
export function parseDuration(input: string): number | null {
  const v = input.trim()
  if (!v) return null
  const mmss = v.match(/^(\d{1,3})\s*[:m]\s*(\d{1,2})$/i)
  if (mmss) return Number(mmss[1]) * 60 + Number(mmss[2])
  if (/^\d+$/.test(v)) return Number(v)
  return Number.NaN
}

export function formatTotalDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.round((seconds % 3600) / 60)
  if (h === 0) return `${m} min`
  return `${h} h ${String(m).padStart(2, '0')}`
}

const dateFmt = new Intl.DateTimeFormat('fr-CA', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const shortFmt = new Intl.DateTimeFormat('fr-CA', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})
const stampFmt = new Intl.DateTimeFormat('fr-CA', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Toronto',
})

/** Date civile (AAAA-MM-JJ) sans décalage de fuseau. */
export function formatDay(isoDate: string, short = false): string {
  const d = new Date(`${isoDate}T00:00:00Z`)
  return (short ? shortFmt : dateFmt).format(d)
}

export function formatTime(time: string | null): string {
  if (!time) return ''
  const [h, m] = time.split(':')
  return `${Number(h)} h ${m}`
}

export function formatStamp(iso: string): string {
  return stampFmt.format(new Date(iso))
}

/** Date du jour au Québec, AAAA-MM-JJ. */
export function todayIso(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Toronto' }).format(new Date())
}
