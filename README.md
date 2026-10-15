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

Le mode « Hors du chapeau » utilise l'API officielle TMDB et nécessite un **API Read Access Token**. Renseigner ce jeton dans **Paramètres** ; il est mémorisé par défaut dans `localStorage`, ou temporairement dans `sessionStorage` si vous désactivez la case « Mémoriser mon jeton sur cet appareil ». Ne jamais inscrire de secret API dans GitHub, un fichier JS ou le JSON. Une app statique ne peut pas empêcher le propriétaire du navigateur de voir le jeton qu'il y saisit ; pour une application publique multi-utilisateur, il faudra un proxy côté serveur.

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

### Animations

Les animations de tirage sont activées par défaut, y compris lors de la première visite. Le réglage « Animations activées » permet de les désactiver ou de les réactiver ; le choix est mémorisé dans le navigateur.

## Réserve TMDB équilibrée et renouvellement

Lorsque Film et Série sont autorisés, le mode Hors du chapeau interroge les deux catalogues indépendamment et vise une réserve d'environ 60 films et 60 séries. Si l'un des deux catalogues contient trop peu de titres correspondant aux filtres, la réserve peut être plus petite et déséquilibrée. Chaque sous-ensemble est obtenu depuis des pages sélectionnées aléatoirement, dans la limite de pagination de TMDB. Le hasard est uniforme dans la réserve construite, **pas dans la totalité du catalogue TMDB**.

Le bouton **Renouveler les découvertes** (visible uniquement en exploration) écarte la réserve courante, charge de nouvelles pages et déclenche un tirage animé avec les filtres inchangés. Les titres déjà tirés, conservés dans l'historique local, sont exclus des nouvelles recherches. Un message apparaît si aucun nouveau titre ne peut être trouvé. La sélection de nouveaux titres dépend de la couverture de l'API et des limites d'accès. L'application effectue plusieurs requêtes TMDB lors du renouvellement.

### Mémorisation du jeton

Dans **Paramètres > Exploration TMDB**, la case **Mémoriser mon jeton sur cet appareil** est cochée par défaut. Enregistrer avec la case cochée place le jeton dans `localStorage` et le conserve entre les visites sur le même navigateur. Décochez-la et enregistrez pour conserver le jeton dans `sessionStorage` seulement ; l’ancienne copie persistante est alors supprimée. Videz le champ du jeton, puis enregistrez pour le retirer des deux stockages. Les données du navigateur peuvent aussi être effacées manuellement. Évitez la mémorisation sur les appareils partagés.

## Exploration : pays et programmes admissibles

Le filtre « Pays d’origine » accepte un pays à la fois. « Monde » (sélectionné par défaut) ne restreint pas la provenance. Il utilise `with_origin_country` sur les recherches TMDB, et ne doit pas être confondu avec la langue originale ni le pays où un film est disponible. Les coproductions peuvent apparaître pour plusieurs pays.

Les films d’animation restent autorisés, y compris les productions japonaises et les films Ghibli. Les **séries d’animation** sont exclues du tirage d’exploration, quelle que soit leur provenance. Les séries sont limitées aux catégories TMDB « mini-série » et « scripted » (`with_type=2|4`), avec exclusion supplémentaire des genres animation, documentaire, news, reality, soap et talk-show. Le filtrage dépend de la qualité du référencement TMDB : des contenus mal catégorisés peuvent subsister, et certaines fictions atypiques peuvent être exclues. Le mode « Dans le chapeau » ne subit aucune de ces exclusions.

### Sélection des pays dans Exploration

Plusieurs pays peuvent être sélectionnés simultanément : ils sont combinés avec une logique OU. Le choix « Monde » efface la sélection géographique et inclut tous les pays. Cliquer à nouveau sur un pays sélectionné le retire.


## Recherche et collection persistante

Dans « Hors du chapeau », la recherche par titre interroge les endpoints TMDB de recherche de films et séries. Elle est indépendante des filtres du tirage. Cliquez sur « Ajouter à mon chapeau » pour conserver un résultat dans la collection locale. Les résultats déjà présents ne sont pas ajoutés en double.

La liste livrée dans `data/collection.json` reste la base initiale, en lecture seule. Les ajouts et imports sont sauvegardés dans le `localStorage` du navigateur (clé `chapeau_saved_v1`) et fusionnés avec la liste initiale à l’affichage. Fermer puis rouvrir le navigateur ne les efface normalement pas. En revanche, nettoyage des données du site, navigation privée, changement d'appareil, quota ou politique du navigateur peuvent effacer ou bloquer ce stockage. **Exportez régulièrement votre collection JSON** et conservez une copie hors du navigateur. Vous pouvez remplacer `data/collection.json` par cette exportation pour assurer la persistance sur votre dépôt.

Dans Paramètres > Ma collection : « Exporter » télécharge l'ensemble des titres (base + ajouts), « Importer » fusionne un tableau JSON de titres à la collection existante en ignorant les doublons d'identifiant. L'import ne supprime aucun titre. « Effacer les ajouts locaux » n'efface pas les titres du JSON initial.
