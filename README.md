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
