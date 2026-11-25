import Image from 'next/image'
import Link from 'next/link'
import { SIGNATURE, SUBTITLE } from '@/lib/domain/copy'

// Bulles discrètes : positions fixes (pas d'aléatoire, donc pas d'écart serveur/client).
const BUBBLES = [
  { left: '8%', size: 10, duration: 13, delay: 0, drift: 18 },
  { left: '19%', size: 6, duration: 17, delay: 4, drift: -10 },
  { left: '33%', size: 14, duration: 15, delay: 7, drift: 24 },
  { left: '47%', size: 7, duration: 19, delay: 2, drift: -16 },
  { left: '61%', size: 11, duration: 14, delay: 9, drift: 12 },
  { left: '72%', size: 5, duration: 18, delay: 5, drift: -8 },
  { left: '84%', size: 16, duration: 16, delay: 1, drift: 20 },
  { left: '93%', size: 8, duration: 20, delay: 11, drift: -14 },
]

export function Hero({ voteLive }: { voteLive: boolean }) {
  return (
    <section className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      {/* Fond fourni : guitare à gauche, cocktail à droite, centre dégagé pour le texte. */}
      <Image
        src="/brand/hero-bar.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      {/* Voile pour la lisibilité : plus dense au centre et en bas, les bords restent lumineux. */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_60%_at_50%_45%,rgb(2_26_36/0.82),rgb(2_26_36/0.35)_70%,transparent)]"
      />
      <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-48 bg-gradient-to-t from-night-deep to-transparent" />
      <div aria-hidden className="absolute inset-0 -z-10 overflow-hidden">
        {BUBBLES.map((b) => (
          <span
            key={b.left}
            className="bubble"
            style={
              {
                left: b.left,
                width: b.size,
                height: b.size,
                animationDuration: `${b.duration}s`,
                animationDelay: `${b.delay}s`,
                '--drift': `${b.drift}px`,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-5 pb-16 pt-10 text-center">
        <Image
          src="/brand/logo.png"
          alt="JamTonic"
          width={1200}
          height={576}
          priority
          sizes="(min-width: 768px) 26rem, 70vw"
          className="fade-up w-[70vw] max-w-[26rem] drop-shadow-[0_12px_30px_rgb(0_0_0/0.55)]"
        />
        <h1 className="display fade-up mt-6 text-[clamp(2.9rem,12vw,6.5rem)] text-cream [animation-delay:120ms] [text-shadow:0_4px_30px_rgb(0_0_0/0.6)]">
          {SIGNATURE[0]}
          <br />
          <span className="tonic-underline">{SIGNATURE[1]}</span>
        </h1>
        <p className="fade-up mt-7 max-w-2xl text-balance text-lg font-medium text-cream/90 [animation-delay:220ms] md:text-xl">
          {SUBTITLE}
        </p>
        <div className="fade-up mt-9 flex w-full max-w-sm flex-col gap-3 [animation-delay:320ms] sm:max-w-none sm:flex-row sm:justify-center">
          <Link href="#repertoire" className="btn btn-primary px-7 text-base">
            Découvre nos tunes
          </Link>
          <Link href="/vote" className="btn btn-secondary px-7 text-base">
            {voteLive ? <span className="size-2.5 animate-pulse rounded-full bg-lime" aria-hidden /> : null}
            Vote pour tes préférées
          </Link>
          <Link href="#propose" className="btn btn-secondary px-7 text-base">
            Propose une tune
          </Link>
        </div>
      </div>
    </section>
  )
}
