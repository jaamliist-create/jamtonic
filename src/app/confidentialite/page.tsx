import type { Metadata } from 'next'
import Link from 'next/link'
import { Footer } from '@/components/public/footer'
import { site } from '@/lib/env'

export const metadata: Metadata = { title: 'Confidentialité' }

export default function ConfidentialitePage() {
  return (
    <>
      <main className="mx-auto max-w-2xl px-5 py-12">
        <Link href="/" className="btn btn-ghost -ml-3">
          ← Accueil
        </Link>
        <h1 className="display mt-4 text-5xl">Confidentialité</h1>
        <p className="mt-4 text-cream/85">
          JamTonic est le site d’un groupe de musique. On collecte le strict minimum pour que les
          votes et les propositions fonctionnent.
        </p>

        <div className="mt-8 space-y-8 leading-relaxed text-cream/90">
          <section>
            <h2 className="display text-2xl text-tonic">Si tu votes ou proposes une tune</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Aucun compte, aucun nom, aucun courriel, aucun numéro de téléphone.</li>
              <li>
                Au premier vote ou à la première proposition, on dépose sur ton appareil un témoin
                (cookie) contenant un identifiant anonyme tiré au hasard. Il sert seulement à retenir
                tes choix et à limiter les votes multiples. Il expire après six mois et tu peux
                l’effacer quand tu veux dans ton navigateur.
              </li>
              <li>
                On enregistre tes votes (quelle tune, pour quelle soirée, à quelle heure) et le texte
                de tes propositions (titre et artiste), rattachés à cet identifiant anonyme.
              </li>
              <li>
                Pour bloquer les abus, on calcule une empreinte chiffrée de ton adresse réseau. Elle
                change chaque jour, elle est effacée après 48 heures et l’adresse elle-même n’est
                jamais conservée.
              </li>
              <li>Aucune publicité, aucun outil de mesure d’audience tiers, aucune revente de données.</li>
            </ul>
          </section>

          <section>
            <h2 className="display text-2xl text-tonic">Ce que le band voit</h2>
            <p className="mt-3">
              Des totaux : combien de votes par tune et par soirée, et quelles chansons sont
              proposées. Le band ne peut pas savoir qui a voté pour quoi.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl text-tonic">Membres du band</h2>
            <p className="mt-3">
              Les musiciens ont un compte (courriel et mot de passe) pour accéder à leur espace
              privé. Ces comptes sont créés sur invitation seulement.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl text-tonic">Hébergement</h2>
            <p className="mt-3">
              Le site est hébergé par Vercel et les données par Supabase, qui agissent comme
              fournisseurs de services pour le groupe.
            </p>
          </section>

          <section>
            <h2 className="display text-2xl text-tonic">Une question ?</h2>
            <p className="mt-3">
              {site.contactEmail ? (
                <>
                  Écris-nous à{' '}
                  <a href={`mailto:${site.contactEmail}`} className="font-bold text-tonic underline underline-offset-4">
                    {site.contactEmail}
                  </a>
                  .
                </>
              ) : (
                'Viens nous voir après un concert : on répond avec plaisir.'
              )}
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </>
  )
}
