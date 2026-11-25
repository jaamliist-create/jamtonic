# JamTonic

**On jamme. Vous choisissez.** — site public, espace privé du band et concerts interactifs.

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · Supabase (PostgreSQL, Auth, RLS) · Vercel · PWA installable.

## Ce que fait l'application

| Espace | Contenu |
|---|---|
| Public (sans compte) | Accueil, répertoire maîtrisé, suggestions, prochains concerts, page de vote d'une soirée (`/s/[code]`, cible du QR code) |
| Privé (`/espace`, membres du band) | Tableau de bord, catalogue, « À découvrir » (votes internes), « À apprendre », playlists, sessions de concert, suggestions du public, statistiques, groupe |

Un seul catalogue alimente les deux espaces. Le public n'en voit que les tunes « Maîtrisé ».

## Démarrage local

Prérequis : Node 22, Docker Desktop.

```bash
npm install
npm run supabase:start          # base locale (ports 5436x), migrations appliquées
cp .env.example .env.local      # puis coller les valeurs de `npx supabase status`
npm run owner:create -- toi@exemple.com "Ton prénom"
npm run dev                     # http://localhost:3000
```

`JT_SECRET` se génère avec :
`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Les courriels locaux (invitations, mots de passe) arrivent dans Mailpit : http://127.0.0.1:54364

### Commandes

| Commande | Rôle |
|---|---|
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` · `npm run lint` | TypeScript, oxlint |
| `npm test` | Tests unitaires et d'intégration (base locale requise) |
| `npm run supabase:reset` | Recrée la base locale depuis les migrations |
| `npm run owner:create` | Crée le propriétaire technique |
| `npm run account -- <identifiant> "<Nom>" [--owner]` | Crée un compte à identifiant (sans courriel) ; avec `ACCOUNT_PASSWORD`, choisit ou change son mot de passe |
| `npm run seed:catalogue` | Charge le catalogue initial (33 tunes), sans doublon ni écrasement |
| `npm run import:catalogue` | Importe un export CSV du Google Sheets |
| `npm run assets:generate` | Régénère logo, hero et icônes depuis `assets/originals/` |

## Architecture

```
src/app            Routes : public, accès, /espace
src/components     ui/ (formulaires, statuts) · public/ · espace/
src/lib/supabase   Clients : server (session membre), public (anonyme), admin (service_role)
src/lib/domain     Types, statuts, normalisation, validation Zod, formats, textes validés
src/lib/data       Lectures (Server Components)
src/lib/actions    Mutations (Server Actions)
src/lib/security   Garde membre, participant anonyme, limite de fréquence
src/lib/import     Analyse du CSV (fonctions pures)
supabase/migrations  Schéma, autorisations, fonctions
scripts            Propriétaire, import, assets
tests              unit/ et integration/
features           Concept, spec et carte des parcours
```

### Décisions structurantes

1. **Trois clients Supabase, trois niveaux de confiance.** Le client `admin` (clé secrète) n'est importable que côté serveur (`server-only`). Il sert aux écritures du public et aux invitations.
2. **L'anonyme n'a aucun privilège sur les tables.** Il lit deux vues (`public_songs`, `public_concerts`) et deux fonctions (`public_get_session`, `public_session_songs`) à colonnes choisies. La règle « seul Maîtrisé est public » vit dans la vue SQL, pas dans l'interface.
3. **Un compte ne suffit pas.** Toute politique RLS exige un profil actif (`is_member()`). Un compte Auth sans profil ne lit rien.
4. **Votes et suggestions du public : écrits par le serveur seulement.** Server Action → limite de fréquence → fonction SQL (`cast_public_vote`, `submit_public_suggestion`) qui revérifie session, sélection, statut de la tune et plafond dans une seule transaction.
5. **Participant anonyme** : UUID signé (HMAC) dans un témoin `httpOnly`. Protection raisonnable, pas une garantie : effacer ses témoins donne un nouvel identifiant. La limite de fréquence par adresse réseau (hachée, renouvelée chaque jour) borne cet abus.
6. **Statuts toujours manuels.** Aucun déclencheur, aucun seuil ne modifie `songs.status`.
7. **Doublons** : colonnes générées `title_norm` / `artist_norm` et index unique. « Hôtel  California! » = « hotel california ».
8. **Pas de suppression** de tunes ni de playlists : archivage réversible. Seule une session en brouillon se supprime.
9. **Pages publiques rendues à chaque requête** : une tune qui quitte « Maîtrisé » disparaît au chargement suivant.
10. **Formulaires** : branchés par `useActionForm` (et non `<form action>`), sinon React vide les champs après chaque envoi, même en erreur.

Écarts par rapport au modèle suggéré : pas de table `song_notes` (les notes du groupe sont une colonne de `songs`), `sessions` s'appelle `concert_sessions`, et `rate_limits` est ajoutée.

### Autorisations

| Donnée | Anonyme | Compte sans profil | Membre | Propriétaire |
|---|---|---|---|---|
| Tunes maîtrisées (titre, artiste, genres, durée, année) | lecture | lecture | tout | tout |
| Autres tunes, notes du groupe, playlists, sessions | — | — | lecture, écriture | idem |
| Notes personnelles | — | — | les siennes | les siennes |
| Votes internes | — | — | lire ; voter et retirer pour soi | idem |
| Votes publics | écriture par le serveur | idem | lecture agrégée | idem |
| Suggestions publiques | écriture par le serveur | idem | lire, retenir, écarter | idem |
| Profils | — | — | lire ; modifier son nom, son instrument | inviter, désactiver |

## Catalogue initial (seed)

`supabase/seed.sql` contient les 33 tunes du répertoire réel, transcrites de l'annexe fournie par le band le 2026-11-22 (source : Google Sheets « Setlist disponible »).

```bash
npm run seed:catalogue                  # base locale, affiche les totaux
npx supabase db push --include-seed     # base distante liée
```

`npm run supabase:reset` rejoue aussi le seed.

**Réexécutable sans rien écraser.** Une tune déjà présente (même titre et même artiste, accents et casse ignorés) n'est ni recréée ni modifiée : statut, priorité, notes et genres changés par les membres sont conservés. Le genre n'est rattaché qu'aux tunes créées par l'exécution en cours.

### Correspondances appliquées

| Dans le tableur | Dans l'application |
|---|---|
| Statut « Maitrisée » | Statut **Maîtrisé** |
| Statut « A pratiquer » | Statut **À réviser** — *provisoire, à valider par le band* |
| Onglet « A apprendre » | Statut **À apprendre**, priorité conservée |
| Priorité Urgent / Moyen terme / Pour le fun | Champ **Priorité** (`songs.learning_priority`) |
| Onglets Rock, Pop, Franco | Genre du même nom |

- **Statut et priorité sont deux champs distincts.** Le statut dit où en est la tune ; la priorité dit à quel point on veut l'apprendre. Les deux se modifient à la main, sur la fiche ou depuis « À apprendre ».
- Les dix tunes de l'onglet « A apprendre » n'ont **aucun genre** : l'onglet ne donne pas leur catégorie musicale, et rien n'est inventé.
- Aucune de ces tunes n'est placée dans « À découvrir », réservée aux nouvelles propositions.
- Le seed ne crée ni durée, ni tonalité, ni notes, ni vote, ni playlist, ni session.

### Totaux après chargement

33 tunes : **9 maîtrisées, 14 à réviser, 10 à apprendre** (7 urgentes, 2 à moyen terme, 1 pour le fun). Le répertoire public affiche les 9 maîtrisées.

> **Écart à trancher.** L'annexe annonce 10 maîtrisées et 13 « À pratiquer », mais ses tableaux en listent 9 et 14 (Rock : 8 et 10 ; Pop : 1 et 2 ; Franco : 0 et 2). Le seed suit les tableaux, ligne par ligne. Si une tune « À pratiquer » est en réalité maîtrisée, il suffit de changer son statut dans le catalogue.

### Corrections de titres

Les titres et noms sont repris tels qu'ils figurent dans l'annexe, que le band a déjà normalisée ; le fichier d'origine n'ayant pas été consulté, les fautes de saisie corrigées en amont ne peuvent pas être listées ici. Aucune correction supplémentaire n'a été appliquée. Deux titres sont conservés sous leur forme abrégée : « This Ain't a Scene » (Fall Out Boy) et « Medley » (Gerry Boulet).

## Import d'autres tunes (export CSV du Google Sheets)

1. Dans Google Sheets : *Fichier > Télécharger > Valeurs séparées par des virgules*, un fichier par onglet, à déposer dans `import/`.
2. Analyse, sans rien écrire :
   ```bash
   npm run import:catalogue -- import/setlist.csv
   ```
   Le script repère les colonnes par leurs en-têtes (Titre, Artiste, Catégorie, Statut, Durée, Année), traite une ligne à cellule unique comme un titre de section, signale doublons et valeurs manquantes, puis crée `import/correspondance.json`.
3. Compléter `import/correspondance.json` : pour chaque catégorie du tableur (Rock, Pop, Franco, À apprendre…), choisir genre, étiquette et **statut**. Rien n'est déduit : une catégorie n'est pas un statut. Une tune sans statut décidé n'est pas importée.
4. Relire le rapport `import/rapport-*.json`, puis appliquer :
   ```bash
   npm run import:catalogue -- import/setlist.csv --appliquer
   ```

Options : `--categorie "Rock"` (un onglet = une catégorie), `--colonnes titre=1,artiste=2` (pas d'en-têtes), `--env .env.production.local`.

L'import ne remplit jamais un champ absent et n'écrase aucune tune existante.

## Tests

`npm test` exécute 49 tests. Les tests d'intégration parlent à la base **locale** (ils refusent toute autre URL) et vérifient les règles contre les vraies politiques RLS :

1. Un anonyme ne lit aucune table privée et n'écrit rien
2. Une tune non maîtrisée n'apparaît pas publiquement
3. Un membre modifie les statuts, sans transition imposée
4. Un seul vote interne par membre, sur « À découvrir » seulement
5. Aucun statut ne change après des votes
6. Les playlists ne dépendent pas des statuts
7. Les votes publics sont isolés par session (plafond, sélection, fermeture)
8. Un participant ne touche pas aux votes d'un autre
9. Une suggestion ne devient jamais une tune sans action d'un membre
10. Un compte sans profil actif, ou désactivé, n'accède à rien

Non couvert : tests E2E Playwright versionnés (les parcours ont été vérifiés à la main dans Chrome).

## Mise en production

Rien n'a été créé à distance. Étapes à faire avec les accès Supabase et Vercel :

### 1. Supabase

1. Créer le projet, puis appliquer les migrations :
   ```bash
   npx supabase link --project-ref <ref>
   npx supabase db push
   ```
2. **Authentication > Sign In / Providers** : désactiver « Allow new users to sign up ». Longueur minimale du mot de passe : 10.
3. **Authentication > URL Configuration** : Site URL = l'URL de production ; ajouter `https://<domaine>/**` aux Redirect URLs.
4. **Authentication > Emails** : coller `supabase/templates/invite.html` (Invite user) et `supabase/templates/recovery.html` (Reset password). Les liens doivent pointer vers `/auth/confirm?token_hash=…`.
5. **SMTP** : le service de courriel intégré de Supabase est très limité et n'écrit qu'aux membres de l'organisation. Configurer un SMTP personnalisé avant d'inviter les musiciens.
6. Créer le propriétaire :
   ```bash
   npm run owner:create -- <courriel> "<Prénom>" .env.production.local
   ```

### 2. Vercel

Importer le dépôt (Next.js est détecté) et définir les variables, en Production et en Preview :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | clé publiable |
| `SUPABASE_SECRET_KEY` | clé secrète, **sans** préfixe `NEXT_PUBLIC_` |
| `NEXT_PUBLIC_SITE_URL` | URL publique, sert aux QR codes |
| `JT_SECRET` | 64 caractères hexadécimaux aléatoires |
| `NEXT_PUBLIC_SOCIAL_*`, `NEXT_PUBLIC_CONTACT_EMAIL` | facultatif, affichés seulement s'ils existent |

Changer `JT_SECRET` invalide les identifiants anonymes en cours : à éviter pendant un concert.

### 3. Domaine

Ajouter le domaine dans Vercel, puis mettre à jour `NEXT_PUBLIC_SITE_URL` et les URL d'authentification Supabase. **Imprimer les QR codes après ce changement** : ils contiennent l'URL publique.

## Assets

Les originaux sont dans `assets/originals/` et ne sont jamais modifiés. `npm run assets:generate` en dérive `public/brand/` (logo rogné, hero en WebP) et les icônes de la PWA.

## PWA

Manifeste, icônes (dont masquable) et couleur de thème : l'application s'installe sur mobile. Il n'y a pas de service worker, donc pas de fonctionnement hors ligne.
