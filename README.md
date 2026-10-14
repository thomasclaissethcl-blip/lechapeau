# Le Chapeau : V1

Application HTML/CSS/JavaScript statique pour tirer au hasard un film ou une série. Le chapeau retourné, sa montée en agitation de 2,55 s, le billet qui sort et les confettis ont été conservés depuis la maquette validée.

## Arborescence

- `index.html` : structure et interface
- `css/style.css` : styles et animations
- `js/app.js` : interface, filtres, stockage local et export
- `js/random.js` : mélange Fisher-Yates et pioche sans remise
- `js/tmdb.js` : découverte de films et séries avec TMDB
- `data/collection.json` : collection éditable

## Démarrage et GitHub Pages

Pour tester localement, depuis ce répertoire, exécuter `python3 -m http.server 8000`, puis ouvrir `http://localhost:8000`. Un double-clic sur le HTML peut bloquer le chargement du JSON (`file://`).

Pour publier, déposer **le contenu de ce répertoire** à la racine d'un dépôt GitHub, puis dans **Settings > Pages**, choisir **Deploy from a branch**, la branche principale et le dossier **/(root)**. L'adresse prendra la forme `https://UTILISATEUR.github.io/DEPOT/`.

## Ajouter des films ou séries

Modifier `data/collection.json`. C'est un tableau d'objets. Les champs `id` et `titre` identifient un titre. Les propriétés libres, par exemple `genre`, `ambiance`, `plateforme`, `pays`, deviennent automatiquement des filtres. Utiliser de préférence des tableaux de chaînes. Les champs `resume`, `annee`, `tmdbId`, `affiche` sont des métadonnées d'affichage ou techniques, et non des catégories de filtres.

```json
{"id":"mon-film","titre":"Mon film","type":["Film"],"genre":["Comédie"],"ambiance":["Léger"],"annee":2020,"resume":"Résumé facultatif"}
```

Au sein d'une catégorie, plusieurs cases fonctionnent avec **OU** ; entre catégories, avec **ET**. Aucune case signifie aucune restriction. Les filtres de la collection sont dérivés des clés effectivement présentes.

## Configurer l’accès à TMDB, étape par étape

1. Rendez-vous sur [TMDB](https://www.themoviedb.org/signup) et créez un compte gratuit, ou connectez-vous.
2. Depuis votre profil, ouvrez **Paramètres > API**. TMDB indique que la demande d'accès à l'API est plus facile à effectuer depuis un ordinateur.
3. Si vous n'avez pas encore d'identifiants, suivez la procédure de demande et acceptez les conditions applicables.
4. Sur la page API de votre compte, copiez **API Read Access Token**, un jeton long. **Ne copiez pas « API Key »**, qui est une autre forme d'identifiant et n'est pas celle attendue dans cette application.
5. Ouvrez **Le Chapeau > Paramètres** (icône en haut à droite), collez ce jeton dans **Jeton API Read Access Token**, puis cliquez sur **Utiliser ce jeton**.
6. Activez **Hors du chapeau** et touchez le chapeau pour vérifier que vous obtenez un résultat. Si une erreur d'authentification apparaît, vérifiez l'identifiant et recommencez.

**Sécurité :** ce jeton est conservé dans `sessionStorage` pour l'onglet en cours. Il est accessible au JavaScript de la page et ne constitue pas un secret protégé côté serveur. Ne l'inscrivez jamais dans `index.html`, `tmdb.js`, `collection.json` ou un commit GitHub. Sur un appareil partagé, effacez le jeton dans les paramètres lorsque vous avez terminé. Pour proposer un accès public sans demander un jeton à chacun, mettez en place un proxy serverless protégeant un jeton commun.

TMDB propose l'utilisation gratuite de son API à des fins non commerciales, sous réserve de ses conditions, dont l'attribution et l'utilisation du logo officiel. Vérifiez la [FAQ officielle](https://developer.themoviedb.org/docs/faq), la [documentation de démarrage](https://developer.themoviedb.org/docs/getting-started) et les [modalités d'authentification](https://developer.themoviedb.org/docs/authentication-application).

## Exploration TMDB

Le mode « Hors du chapeau » utilise l'API officielle TMDB et nécessite un **API Read Access Token**. Renseigner ce jeton dans **Paramètres** ; il est stocké seulement pour l'onglet en cours via `sessionStorage`. Ne jamais inscrire de secret API dans GitHub, un fichier JS ou le JSON. Une app statique ne peut pas empêcher le propriétaire du navigateur de voir le jeton qu'il y saisit ; pour une application publique multi-utilisateur, il faudra un proxy côté serveur.

Les filtres de genre et d'époque sont transmis aux endpoints `discover/movie` et `discover/tv`. Les « ambiances » sont des correspondances éditoriales imparfaites avec des genres. La durée s'applique uniquement aux films. Le tirage est sans remise à l'intérieur d'un lot de résultats récupéré sur plusieurs pages aléatoires, et **n'est pas un échantillon uniformément représentatif de l'ensemble du catalogue TMDB**. Les limites et variations de pagination de l'API s'appliquent.

Les découvertes ajoutées sont conservées en `localStorage`. Le bouton **Exporter le JSON enrichi** télécharge une collection à réinjecter manuellement dans `data/collection.json` pour que les ajouts soient permanents et partagés.

Ce produit utilise l'API TMDB mais n'est ni approuvé ni certifié par TMDB. Vérifier les conditions d'utilisation et les obligations d'attribution applicables avant publication publique, notamment l'emploi du logo TMDB.

## Limitations connues

- Pas de synchronisation entre navigateurs.
- Les filtres numériques ne sont pas transformés en intervalles automatiques ; la collection fonctionne surtout avec des catégories textuelles.
- La recherche TMDB peut être lente et ne garantit pas la couverture exhaustive du catalogue.
- L'exploration n'est pas disponible sans jeton et sans connexion Internet.
- Pas de tests de rendu automatisés dans un navigateur intégrés au dépôt.

## Groupes de films et univers

Le champ facultatif `collection` accepte un tableau de chaînes, par exemple `"collection": ["Univers Alien"]`. Il est automatiquement transformé en filtre dans le mode « Dans le chapeau ». On peut associer plusieurs collections au même titre et ajouter librement de nouveaux regroupements. Les titres sans champ `collection` restent éligibles aux tirages sans filtre. Dans un groupe, plusieurs choix sont combinés par OU ; entre groupes de filtres, la combinaison est un ET.

## Diagnostic du mode Hors du chapeau

Cette version affiche explicitement les erreurs TMDB dans une carte de résultat, avec les actions « Réessayer le tirage » et « Vérifier le jeton TMDB ». Le jeton attendu est le **API Read Access Token** (jeton Bearer), pas la clé API v3. En cas de problème réseau, une requête expire au bout de 12 secondes. Les données externes nécessitent un accès réseau et un jeton valide.
