# JamTonic — conventions du projet

Application d'un groupe de reprises (le nombre de musiciens varie, ne jamais l'afficher) : site public, espace privé `/espace`, votes du public en concert. Voir `README.md` pour l'architecture et `features/concept.md` pour la vision.

## Stack

Next.js 16 App Router (`src/proxy.ts`, pas `middleware.ts`), React 19, TypeScript strict avec `noUncheckedIndexedAccess`, Tailwind 4 (tokens dans `src/app/globals.css`), Supabase (`@supabase/ssr`), Zod 4, Vitest, oxlint.

Interface en français du Québec uniquement, pas d'i18n. Vocabulaire du band : « tune », « Propose une tune », « Vote pour tes préférées ». Tutoiement. Les textes validés sont dans `src/lib/domain/copy.ts` : ne pas les reformuler.

## Règles métier à ne jamais casser

- Un seul catalogue (`songs`). Le public ne lit que les vues et fonctions `public_*`.
- Seules les tunes « Maîtrisé » non archivées sont publiques. La règle vit en SQL.
- Les statuts ne changent que par l'action d'un membre. Aucun automatisme.
- Les votes publics appartiennent à une session. Jamais de compteur global stocké.
- Une suggestion du public ne crée une tune que par `create_song_from_suggestion`, appelée par un membre.
- Les playlists ne dépendent pas des statuts.
- Statut et priorité (`learning_priority`) sont deux champs distincts, tous deux manuels.
- `supabase/seed.sql` est le catalogue réel du band : il doit rester réexécutable sans doublon et sans écraser les modifications des membres (`on conflict do nothing`).

## Sécurité

- `createAdminClient()` (clé secrète) : serveur seulement, dans des modules `server-only`.
- L'anonyme n'a aucun privilège sur les tables. Toute nouvelle table : RLS activée, `revoke` pour `anon`, politique fondée sur `is_member()`.
- Toute nouvelle fonction SQL : `set search_path = ''`, puis `revoke execute ... from public, anon, authenticated` et octroi explicite.
- Écritures publiques : Server Action → `allow()` (limite de fréquence) → fonction SQL réservée à `service_role`.
- Chaque Server Action privée commence par `memberOrNull()`.

## Code

- Lectures dans `src/lib/data`, mutations dans `src/lib/actions`, validation dans `src/lib/domain/schemas.ts`.
- Un fichier `'use server'` n'exporte que des fonctions asynchrones (les constantes vont ailleurs).
- Formulaires : `useActionForm` de `src/components/ui/form.tsx`, jamais `<form action={...}>` (React viderait les champs après une erreur).
- Mobile d'abord : cibles tactiles d'au moins 44 px (`min-h-11`), `md:` pour la tablette, `lg:` pour l'ordinateur. Aucune action réservée au survol.
- Après une migration : `npx supabase gen types typescript --local > src/lib/supabase/database.types.ts`.
- Ne pas inventer de contenu (concerts, biographies, coordonnées). États vides soignés à la place.

## Vérifier avant de livrer

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Les tests d'intégration exigent `npm run supabase:start`. Supabase local utilise les ports 5436x (d'autres projets occupent 5432x et 5434x sur cette machine).

## Git

Aucun commit ni push sans demande explicite.
