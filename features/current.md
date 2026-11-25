# JamTonic V1 — site public, espace du band et concerts interactifs

Status: Implemented

Concept de référence : `features/concept.md` (décisions 1 à 8 tranchées).

## User Story

En tant que musicien de JamTonic,
je veux gérer notre catalogue, décider avec le band de ce qu'on apprend, préparer nos setlists et voir ce que le public demande pendant un concert,
afin que le band ait un seul outil quotidien pour sa musique.

En tant que spectateur dans un bar,
je veux découvrir le répertoire, voter pour mes tunes préférées et en proposer de nouvelles sans créer de compte,
afin de participer à la soirée.

## Synthèse produit

- **Un catalogue unique** (`songs`). Le public n'en lit qu'une projection : les tunes « Maîtrisé » non archivées.
- **Cinq statuts manuels** : À découvrir · À apprendre · En cours · À réviser · Maîtrisé. Aucune transition automatique, toutes les transitions sont permises.
- **Membres égaux** (nombre variable), plus un drapeau « propriétaire technique » pour les invitations et les accès.
- **Votes internes** sur « À découvrir » seulement, un par membre et par tune.
- **Playlists** libres, ordonnées, indépendantes des statuts.
- **Sessions de concert** avec QR code, sélection de tunes et classement isolé par session.
- **Votes et suggestions du public** anonymes, écrits uniquement par le serveur, avec limite de fréquence.

## Structure des routes

| Route | Accès | Rôle |
|---|---|---|
| `/` | public | Hero, Notre univers, Notre répertoire, Propose une tune, Prochains concerts, footer |
| `/vote` | public | Redirige vers la session active s'il n'y en a qu'une, sinon liste ou état vide |
| `/s/[slug]` | public | Page d'une session : vote et suggestion (cible du QR code) |
| `/confidentialite` | public | Ce qui est collecté et pourquoi |
| `/connexion`, `/mot-de-passe-oublie` | public | Accès membres |
| `/auth/confirm` | public | Échange du jeton d'invitation ou de réinitialisation |
| `/definir-mot-de-passe` | session en cours | Choix du mot de passe |
| `/espace` | membre | Tableau de bord |
| `/espace/catalogue`, `/nouveau`, `/[id]` | membre | Catalogue, création, fiche |
| `/espace/a-decouvrir` | membre | Propositions et votes internes |
| `/espace/a-apprendre` | membre | À apprendre et En cours |
| `/espace/playlists`, `/[id]` | membre | Playlists |
| `/espace/sessions`, `/[id]`, `/[id]/affiche` | membre | Sessions, classement, affiche QR imprimable |
| `/espace/suggestions` | membre | Suggestions du public |
| `/espace/statistiques` | membre | Statistiques |
| `/espace/groupe` | membre | Membres, invitations (propriétaire), mon profil |

## Critères d'acceptation

### Phase 1 — Fondations

#### Scénario 1.1 — Accès privé protégé
- **Given** un visiteur non connecté
- **When** il ouvre une route `/espace/*`
- **Then** il est redirigé vers `/connexion`

#### Scénario 1.2 — Compte sans profil actif
- **Given** un compte Supabase Auth sans ligne `profiles` active
- **When** il se connecte
- **Then** il n'accède à aucune page ni donnée privée et voit « Ton accès n'est pas activé »

#### Scénario 1.3 — Aucune inscription publique
- **Given** un visiteur
- **When** il tente de créer un compte par l'API Auth
- **Then** l'inscription est refusée (inscription désactivée)

### Phase 2 — Catalogue privé

#### Scénario 2.1 — Créer une tune
- **Given** un membre connecté
- **When** il saisit un titre et un artiste et enregistre
- **Then** la tune est créée avec le statut choisi (par défaut « À découvrir »), l'auteur et la date

#### Scénario 2.2 — Doublon
- **Given** « Hôtel California — Eagles » existe
- **When** un membre saisit « hotel  california » / « EAGLES »
- **Then** la création est refusée avec un lien vers la tune existante (y compris si elle est archivée)

#### Scénario 2.3 — Statut en deux gestes
- **Given** une tune dans n'importe quel statut
- **When** un membre choisit un autre statut depuis la liste ou la fiche
- **Then** le statut change immédiatement, sans étape intermédiaire imposée, et l'activité est journalisée

#### Scénario 2.4 — Recherche et filtres combinables
- **Given** le catalogue
- **When** le membre tape du texte et choisit statut(s), genre(s), étiquette(s), archivées ou non
- **Then** la liste respecte tous les critères à la fois ; la recherche ignore accents et casse

#### Scénario 2.5 — Notes
- **Given** une fiche
- **When** un membre modifie les notes générales
- **Then** tous les membres voient la modification
- **And** ses notes personnelles ne sont lisibles que par lui

#### Scénario 2.6 — Invitation
- **Given** le propriétaire technique dans `/espace/groupe`
- **When** il invite un courriel
- **Then** un courriel d'invitation part et un profil actif est préparé ; les autres membres ne voient pas ce formulaire

### Phase 3 — Collaboration

#### Scénario 3.1 — Proposer et voter
- **Given** la page « À découvrir »
- **When** un membre propose une tune puis vote
- **Then** la tune apparaît au statut « À découvrir », le compteur passe à 1, la liste est triée par votes décroissants

#### Scénario 3.2 — Un vote par membre
- **Given** un membre a voté pour une tune
- **When** il tente de voter à nouveau (même par l'API)
- **Then** la base refuse le second vote ; il peut retirer son vote

#### Scénario 3.3 — Pas de changement automatique
- **Given** tous les membres ont voté pour une tune
- **When** on recharge
- **Then** le statut est toujours « À découvrir » jusqu'à ce qu'un membre tape « Passer à apprendre »

#### Scénario 3.4 — Vote interne limité à « À découvrir »
- **Given** une tune « En cours »
- **When** un membre tente d'insérer un vote interne
- **Then** la base refuse

#### Scénario 3.5 — Playlists
- **Given** une playlist
- **When** un membre ajoute des tunes de statuts variés, les réordonne, en retire, duplique ou archive la playlist
- **Then** l'ordre est conservé, la durée totale estimée s'affiche (avec le nombre de tunes sans durée), et un changement de statut ne modifie jamais la playlist

### Phase 4 — Site public

#### Scénario 4.1 — Répertoire public
- **Given** des tunes dans tous les statuts
- **When** un visiteur ouvre « Notre répertoire »
- **Then** seules les tunes « Maîtrisé » non archivées apparaissent, sans notes ni statut
- **And** une tune qui quitte « Maîtrisé » disparaît au chargement suivant

#### Scénario 4.2 — Suggestion
- **Given** le formulaire « Propose une tune »
- **When** un visiteur envoie titre et artiste
- **Then** il lit « Merci de ta proposition ! Le band va travailler fort pour apprendre cette chanson. »
- **And** aucune tune n'est créée dans le catalogue

#### Scénario 4.3 — États vides
- **Given** aucune tune maîtrisée, aucune session programmée
- **When** un visiteur ouvre l'accueil
- **Then** il voit des états vides soignés, sans contenu inventé

### Phase 5 — Concerts interactifs

#### Scénario 5.1 — Session et QR code
- **Given** un membre crée une session et choisit ses tunes (depuis une playlist ou tout le maîtrisé)
- **When** il ouvre l'affiche
- **Then** un QR code pointe vers `/s/[slug]` et la page est imprimable

#### Scénario 5.2 — Voter
- **Given** une session active, votes ouverts
- **When** un spectateur tape sur une tune
- **Then** son vote est enregistré une seule fois pour cette tune et cette session ; il peut le retirer ; il ne voit pas les scores

#### Scénario 5.3 — Plafond
- **Given** un plafond de 5 votes
- **When** le spectateur tente un 6e vote
- **Then** il est refusé avec un message clair

#### Scénario 5.4 — Isolation
- **Given** deux sessions contenant la même tune
- **When** on vote dans l'une
- **Then** le classement de l'autre ne change pas

#### Scénario 5.5 — Tune hors sélection
- **Given** une tune absente de la sélection, ou plus « Maîtrisé »
- **When** une requête de vote arrive
- **Then** elle est refusée côté serveur

#### Scénario 5.6 — Classement du band
- **Given** une session avec des votes
- **When** un membre ouvre le classement
- **Then** il voit rang, titre, artiste, votes et hausse récente (10 dernières minutes), avec un bouton d'actualisation et un rafraîchissement automatique discret

#### Scénario 5.7 — Suggestion vers le catalogue
- **Given** une suggestion du public
- **When** un membre choisit « Créer la tune »
- **Then** une tune « À découvrir » est créée (contrôle de doublon) et la suggestion est marquée retenue ; rien ne se passe sans cette action

### Phase 6 — Statistiques et finition

#### Scénario 6.1 — Tableau de bord sans faux chiffres
- **Given** une base vide
- **Then** le tableau de bord affiche des zéros et des états vides utiles

#### Scénario 6.2 — Statistiques
- **Then** tunes par statut, propositions internes les plus votées, activité récente, votes par session, tunes les plus demandées (cumul), suggestions les plus fréquentes, comparaison entre concerts

#### Scénario 6.3 — PWA
- **Then** manifeste, icônes et thème permettent l'installation ; aucune promesse de hors-ligne

## Impacts UI

- Design tokens CSS : `--jt-night #063B50`, `--jt-tonic #FFC735`, `--jt-wood #754027`, `--jt-cream #F5E8D4`, et dérivés.
- Titres : Barlow Condensed 800 italique. Texte : DM Sans.
- Public : hero plein écran sur le fond fourni, logo en image, titre HTML crème avec soulignement jaune sous « Vous choisissez. », bulles discrètes.
- Privé : même identité, fond sombre, barre du bas sur mobile, barre latérale sur ordinateur.
- `data-testid` clés : `login-form`, `song-form`, `song-row`, `status-select`, `discover-vote`, `discover-promote`, `playlist-item`, `public-song`, `vote-toggle`, `suggest-form`, `suggest-success`, `ranking-row`, `session-qr`.

## Impacts backend / base de données

Tables : `profiles`, `songs`, `genres`, `song_genres`, `tags`, `song_tags`, `song_member_notes`, `internal_votes`, `playlists`, `playlist_songs`, `concert_sessions`, `session_songs`, `public_votes`, `public_suggestions`, `activity_log`, `rate_limits`.

Écarts assumés par rapport à la liste suggérée :
- Pas de table `song_notes` : les notes générales sont une colonne de `songs` (une seule note partagée par tune).
- `sessions` s'appelle `concert_sessions` pour ne pas se confondre avec `auth.sessions`.
- `rate_limits` ajoutée pour la limite de fréquence côté serveur.

Fonctions : `is_member()`, `is_owner()`, `jt_normalize()`, `reorder_playlist()`, `duplicate_playlist()`, `set_session_songs()`, `cast_public_vote()`, `submit_public_suggestion()`, `check_rate_limit()`, `session_ranking()`, statistiques agrégées.

Vues publiques : `public_songs`, `public_concerts`, `public_session_songs`.

## Règles d'autorisation

| Donnée | Anonyme | Compte sans profil actif | Membre | Propriétaire |
|---|---|---|---|---|
| Tunes maîtrisées (titre, artiste, genres, durée, année) | lecture par vue | lecture par vue | tout | tout |
| Autres tunes, notes générales | rien | rien | lecture et écriture | idem |
| Notes personnelles | rien | rien | les siennes seulement | les siennes seulement |
| Votes internes | rien | rien | lecture ; écrire et retirer le sien | idem |
| Playlists, sessions (gestion) | rien | rien | lecture et écriture | idem |
| Sessions programmées ou actives | lecture par vue | idem | tout | tout |
| Votes publics | écriture par le serveur seulement | idem | lecture agrégée | idem |
| Suggestions publiques | écriture par le serveur seulement | idem | lecture, tri | idem |
| Profils | rien | rien | lecture ; modifier son nom et son instrument | inviter, désactiver |
| Journal d'activité | rien | rien | lecture | lecture |

## Scénarios de test

Tests d'intégration (Vitest contre Supabase local) :
- [x] 1. Un anonyme ne lit aucune table privée
- [x] 2. Une tune non maîtrisée n'apparaît pas dans `public_songs`
- [x] 3. Un membre modifie les statuts
- [x] 4. Un seul vote interne par membre et par tune ; refus hors « À découvrir »
- [x] 5. Aucun statut ne change après des votes
- [x] 6. Une playlist garde ses tunes quand leur statut change
- [x] 7. Votes publics isolés par session
- [x] 8. Un participant ne peut pas retirer le vote d'un autre ; l'anonyme ne peut pas écrire directement
- [x] 9. Une suggestion ne crée pas de tune
- [x] 10. Un compte sans profil actif n'accède à rien
- [x] Plafond de votes, tune hors sélection, limite de fréquence

Tests unitaires : normalisation, analyse CSV, signature du témoin de participation.

## Hors scope

- Hors-ligne, temps réel par websocket, notifications.
- Fichiers joints, éditeur musical.
- Création de ressources Supabase ou Vercel distantes, commits et push : sur demande explicite seulement.
- Tests E2E Playwright (`/qa-feature`).

## Date
2026-11-22

---
<!-- Sections ajoutées automatiquement par /spec-feature full -->

## Notes Architecture

**Verdict : 🟢 GO.** Projet neuf, périmètre clair, un seul déploiement Next.js et une seule base. Le seul point délicat est la frontière public/privé, traitée en base plutôt que dans l'interface.

Décisions structurantes :
- **Next.js 16 App Router, TypeScript strict, Tailwind 4, `@supabase/ssr`.** Le fichier d'interception s'appelle `src/proxy.ts`.
- **Trois clients Supabase** : navigateur (aucun usage pour les écritures publiques), serveur avec témoins (membres, RLS), et administrateur `service_role` importé uniquement depuis des modules `server-only`.
- **L'anonyme n'a aucun privilège sur les tables.** Il lit trois vues à colonnes choisies. Ses écritures passent par des Server Actions qui appellent des fonctions SQL réservées à `service_role`.
- **Appartenance** : `is_member()` vérifie un profil actif. Toutes les politiques RLS s'appuient dessus, donc un compte Auth seul ne donne rien.
- **Doublons** : colonnes générées `title_norm` / `artist_norm` (sans accents, minuscules, ponctuation et espaces réduits) avec index unique.
- **Opérations sensibles en transaction** : réordonnancement, duplication, sélection de session, vote public (vérifications + insertion dans la même fonction).
- **Participant anonyme** : UUID signé par HMAC dans un témoin `httpOnly`, posé au premier vote. Jamais renvoyé au client autrement.
- **Limite de fréquence** : compteur par fenêtre en base, clé = HMAC de l'adresse réseau et du jour. Aucune adresse stockée en clair.
- **Journal** : déclencheurs sur `songs`, `playlists`, `concert_sessions`.

Risques :
- Wi-Fi de bar : beaucoup de spectateurs derrière une même adresse. Les seuils par adresse sont larges ; le plafond par participant fait le vrai travail.
- Trois piles Supabase locales tournent déjà sur la machine : ports dédiés 5436x.
- La clé `service_role` devient nécessaire en production (invitations, écritures publiques). Variable serveur seulement.

Structure du code :
```
src/app            routes (public, accès, espace)
src/components     ui/ (boutons, cartes…), public/, espace/
src/lib/supabase   clients
src/lib/domain     types, statuts, normalisation, validation Zod
src/lib/data       lectures (Server Components)
src/lib/actions    mutations (Server Actions)
src/lib/security   participant, limite de fréquence, garde membre
supabase/migrations
scripts            import CSV, création du propriétaire, icônes
tests              intégration et unitaires
```

## Notes UX

- **Vitesse d'accès** 🟢 — QR code → page de vote sans étape. Statut modifiable depuis la liste.
- **Clarté** 🟢 — vocabulaire du band (« tunes », « Propose une tune »), un seul bouton principal par écran.
- **Feedback** 🟢 — vote optimiste avec retour immédiat et annulation en cas de refus ; confirmations en ligne, pas de fenêtres bloquantes.
- **Mobile-first** 🟢 — cibles d'au moins 44 px, contraste élevé pour la pénombre, actions dans la zone du pouce.

🟡 À surveiller :
- Plafond de votes : afficher « 3 / 5 » en permanence en haut de la page de vote.
- Longues listes : recherche collante en haut du répertoire et de la page de vote.
- Suppression : pas de suppression définitive des tunes dans l'interface, seulement l'archivage (réversible).
- Animations : respecter `prefers-reduced-motion`.

Points forts à conserver : pas de compte pour le public, états vides honnêtes, message de remerciement exact.

## Gestes Mobiles

| Élément | Geste | Résultat |
|---|---|---|
| Tune (page de vote) | tap sur toute la carte | vote ou retrait |
| Vote interne | tap sur le bouton | vote ou retrait |
| Statut | tap sur la pastille | sélecteur natif |
| Playlist | glisser la poignée | réordonne |
| Playlist | boutons monter / descendre | réordonne (alternative accessible) |
| Classement | bouton Actualiser | recharge |

Règles : pas de balayage destructif, pas de geste caché sans équivalent visible, la poignée de glissement n'intercepte pas le défilement de la page (`touch-action: none` sur la poignée seulement).

États gestuels : pression visible (`active:`), vote en attente atténué, élément glissé surélevé.

## Adaptation Tablette

- Accueil : **Respirer** — répertoire sur 2 colonnes (`md:grid-cols-2`).
- Page de vote : **Contenir** (`md:max-w-2xl md:mx-auto`).
- Catalogue, À découvrir, À apprendre : **Contenir** (`md:max-w-3xl`).
- Tableau de bord, statistiques : **2 colonnes** (`md:grid-cols-2`).
- Inchangé : cibles, gestes, barre du bas. Aucun point 🔴.

## Adaptation Desktop

- Coque privée : **Repositionner** — la barre du bas devient une barre latérale fixe (`lg:flex`, `lg:pl-64`), la barre du bas disparaît (`lg:hidden`).
- Accueil : **Contenir** (`lg:max-w-6xl`), répertoire sur 3 colonnes.
- Fiche de tune : **Paralléliser** — informations à gauche, notes à droite (`lg:grid-cols-2`).
- Session : **Paralléliser** — réglages et classement côte à côte.
- Survol : mise en valeur seulement, aucune action réservée au survol. Aucun point 🔴.

## Intégration Workflow

**Verdict : 🟢 Fluide.** Projet neuf : la carte est créée dans `features/workflow.md`.

- Public : QR code → `/s/[slug]` → vote → suggestion → fin. Ou accueil → répertoire → `/vote`.
- Band : connexion → tableau de bord → (À découvrir → À apprendre → catalogue) ou (playlists → session → classement).
- Risque : un spectateur qui arrive sur `/vote` sans session active. Réponse : état vide qui renvoie au répertoire et aux prochains concerts.

## Notes Métriques

- North Stars proposées : tunes maîtrisées (progression du répertoire) et votes par concert (participation).
- Événements disponibles sans outil tiers : votes publics (horodatés, par session), suggestions, votes internes, journal d'activité.
- Aucune mesure d'audience tierce en V1 : rien à consentir, rien à charger.
- Les statistiques sont calculées par des fonctions SQL agrégées, jamais stockées.

## Notes Juridiques

**Verdict : 🟡 à sécuriser, non bloquant.** Domaines : renseignements personnels (Loi 25 au Québec), témoins, contenu soumis par le public.

Directives :
- Le témoin de participation est fonctionnel et posé à la suite d'un geste de l'utilisateur (son premier vote). Pas de bandeau requis, mais une page `/confidentialite` l'explique en clair.
- Aucune adresse réseau stockée : seulement une empreinte HMAC qui change chaque jour, purgée après 48 h.
- Suggestions : texte libre limité à titre et artiste, 120 caractères, jamais affiché publiquement (pas de modération publique à prévoir).
- Courriels des membres : visibles du propriétaire seulement.
- Coordonnées du responsable sur `/confidentialite` : à fournir par le band (variable de configuration), rien n'est inventé.
- Les titres et noms d'artistes sont des faits, pas des œuvres reproduites. Les droits d'exécution en concert relèvent de la salle et du band (SOCAN), hors application.
