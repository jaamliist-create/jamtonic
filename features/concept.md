# Concept — JamTonic, la soirée qui se construit avec le public

Date : 2026-11-22
Status: Validated (toutes les recommandations acceptées par Florian le 2026-11-22)

## Le vrai problème

> Les musiciens gèrent leur répertoire dans un Google Sheets et décident à l'oral de ce qu'ils
> apprennent. En concert, le public crie des demandes que personne n'entend. Rien ne relie
> ce que le band sait jouer, ce qu'il veut apprendre et ce que la salle a envie d'entendre.

**Qui** : deux publics. Les musiciens de JamTonic (tous égaux), et le spectateur dans un bar, téléphone dans une main, verre dans l'autre.

**Quand** :
- *Musicien* — entre deux répétitions (« on apprend quoi ? »), la veille d'un show (« on joue quoi ? »), et sur scène entre deux tunes (« ils veulent quoi ? »).
- *Spectateur* — assis au bar, il voit un QR code sur la table. Il a 20 secondes d'attention.

**Frustration** :
- Le tableur ne dit pas où en est chaque tune, ni ce que les autres ont envie de travailler.
- Les demandes du public se perdent, et le band n'a aucune mémoire de ce qui a plu d'un concert à l'autre.

## Le concept proposé

**Un seul catalogue, deux fenêtres.**

*Côté band.* Marie ouvre JamTonic sur son téléphone. Elle a entendu une tune à la radio : elle la propose dans « À découvrir » en dix secondes. Les autres passent, mettent leur vote. Jeudi, en répétition, la liste est déjà triée : on voit ce qui tente le monde. Quelqu'un tape « Passer à apprendre » — personne d'autre n'a besoin d'approuver. La tune avance ensuite à la main : en cours, à réviser, maîtrisée. Chacun garde ses notes à lui (ses accords, ses réglages) à côté des notes du groupe (la structure, la fin).

Dès qu'une tune est « Maîtrisée », elle apparaît toute seule dans le répertoire public. Dès qu'elle ne l'est plus, elle en disparaît.

*Côté public.* Au bar, Alex scanne le QR code. Pas de compte, pas d'installation : il arrive directement sur la soirée en cours, voit les tunes que le band peut jouer ce soir, tape sur celles qu'il veut entendre. Il ne voit pas les scores des autres : il vote selon son goût. Si sa tune fétiche n'y est pas, il la propose.

*Sur scène.* Entre deux morceaux, le guitariste jette un œil au classement de la soirée : ce qui monte, ce qui est demandé. Le band choisit — toujours. Le lendemain, les statistiques montrent ce qui a marché, et les suggestions du public peuvent, si le band le veut, devenir une tune « À découvrir ».

## Intégration dans le flow existant

Projet neuf : aucun flow existant. Le dépôt ne contient que le logo et le fond du hero.

**Point d'entrée public** : la page d'accueil, ou le QR code d'une session (accès direct).
**Point d'entrée privé** : `/connexion`, puis le tableau de bord.
**Sortie naturelle** : le spectateur repose son téléphone ; le musicien retourne jouer.

```
JamTonic
├── Public (sans compte)
│   ├── /                    Accueil : hero · univers · répertoire · propose · concerts
│   ├── /vote                Aiguillage vers la soirée en cours
│   └── /s/[code]            Une soirée (cible du QR code) : voter · proposer
│
├── Accès
│   ├── /connexion
│   ├── /mot-de-passe-oublie
│   └── /definir-mot-de-passe   (arrivée depuis l'invitation)
│
└── Espace du band (membres seulement)
    ├── /espace                  Tableau de bord
    ├── /espace/catalogue        Toutes les tunes · recherche · filtres · fiche
    ├── /espace/a-decouvrir      Proposer · voter · « Passer à apprendre »
    ├── /espace/a-apprendre      À apprendre · en cours
    ├── /espace/playlists        Collections libres, ordonnables
    ├── /espace/sessions         Soirées · QR code · classement en direct
    ├── /espace/suggestions      Propositions du public
    ├── /espace/statistiques
    └── /espace/groupe           Membres · invitations · mon profil
```

## Décisions métier tranchées

Toutes les recommandations ci-dessous ont été acceptées.

### Décision 1 — Le public voit-il les scores ?
**Option A** : non, chacun ne voit que ses propres votes — *Avantage : pas d'effet de meute, le band reste libre sans avoir l'air d'ignorer le « gagnant ». / Risque : moins de spectacle.*
**Option B** : classement public en direct — *Avantage : effet de jeu. / Risque : pression pour jouer le n° 1, incitation à tricher.*
**Retenu** : **A**. La promesse est « le band garde la décision finale ».

### Décision 2 — Combien de votes par spectateur ?
**Option A** : illimité (un par tune) — *simple, mais « tout cocher » ne dit rien.*
**Option B** : plafond réglable par session, 5 par défaut — *force un choix ; un réglage de plus.*
**Retenu** : **B**, plafond réglable (vide = illimité).

### Décision 3 — Identifier un spectateur sans compte
**Option A** : identifiant anonyme dans un témoin (cookie) posé par le serveur au premier vote, plus limite de fréquence par adresse réseau hachée.
**Option B** : code SMS ou courriel — *fiable, mais tue la participation au bar et collecte des données personnelles.*
**Retenu** : **A**, présenté honnêtement comme une protection raisonnable, pas une garantie.

### Décision 4 — Comment les membres entrent
**Option A** : invitation par courriel par le propriétaire technique, puis courriel + mot de passe.
**Option B** : lien magique à chaque connexion — *pénible sur scène.*
**Retenu** : **A**. Aucune inscription publique.

### Décision 5 — Une session « programmée » est-elle visible ?
**Option A** : toute session programmée ou active apparaît dans « Prochains concerts », sauf si on décoche « Afficher sur le site ».
**Option B** : rien n'est public sans action explicite.
**Retenu** : **A**, avec la case à décocher pour les événements privés. Le QR code fonctionne dans les deux cas.

### Décision 6 — Suggestions du public : avec ou sans soirée ?
**Retenu** : les deux. Le formulaire existe sur l'accueil et sur la page d'une soirée ; la suggestion garde la trace de la soirée d'où elle vient. Les suggestions identiques sont regroupées pour le band.

### Décision 7 — Tunes de la soirée : d'où viennent-elles ?
**Option A** : tout le répertoire maîtrisé, automatiquement.
**Option B** : sélection propre à la session, pré-remplie depuis une playlist ou depuis tout le maîtrisé.
**Retenu** : **B**. La sélection est une liste explicite ; une tune qui n'est plus maîtrisée cesse d'être proposée au public sans qu'on ait à la retirer.

### Décision 8 — Import du Google Sheets
**Option A** : conversion automatique catégorie → statut.
**Option B** : import en deux temps : rapport de validation, puis application avec une correspondance explicite écrite par le band.
**Retenu** : **B**. Les catégories « Rock / Pop / Franco » sont proposées comme genres ; aucun statut n'est deviné.

## États clés à concevoir

| État | Ce que l'utilisateur voit |
|------|--------------------------|
| Vide (1ère fois) | Répertoire public : « Le répertoire s'en vient ». Concerts : « Pas de date annoncée pour l'instant ». Tableau de bord : invitations à ajouter une première tune, pas de faux chiffres. |
| Nominal | Listes denses mais lisibles, statut modifiable en deux gestes, vote en un tap. |
| Limite | 200+ tunes : recherche instantanée et filtres combinables. Soirée de 60 tunes : recherche dans la page de vote. Plafond de votes atteint : message clair, on peut retirer un vote. |
| Erreur | Soirée terminée ou votes fermés : message chaleureux, pas d'erreur technique. Trop de requêtes : « Wô, pas si vite ! ». Session expirée côté membre : retour à la connexion. |

## Chemin d'évolution

- **V2** : classement en direct sans recharger (temps réel), notes personnelles partageables, marquer les tunes « jouées » pendant une soirée.
- **V3** : mode hors ligne pour la setlist sur scène, partitions et fichiers joints, export de la setlist en PDF.
- **Plus tard** : dédicaces et messages du public, pourboires, page presse et réservation.

Invariants :
- **Un seul catalogue.** Le public ne lit jamais qu'une projection filtrée du catalogue privé.
- **Le statut est toujours manuel.** Aucun vote, aucun seuil ne change un statut.
- **Les votes appartiennent à une session.** Jamais de compteur global stocké ; les cumuls sont calculés.
- **Playlists indépendantes des statuts.**
- **Une suggestion publique n'est jamais une tune** tant qu'un membre ne l'a pas décidé.

## Hors scope (pour ce concept)

- Mode hors ligne, temps réel par websocket, notifications.
- Éditeur musical (tablatures, grilles d'accords structurées), fichiers joints.
- Rôles différenciés entre musiciens (seul le propriétaire technique gère les accès).
- Biographies, photos, coordonnées et réseaux sociaux : à fournir par le band, rien n'est inventé.
