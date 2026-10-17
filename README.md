# Fibre Hérault

Carte interactive de l'éligibilité des immeubles de l'Hérault à la fibre optique.

**Démo en ligne : [mawa399.github.io/fibre-THD-herault](https://mawa399.github.io/fibre-THD-herault/)**

Pour chaque adresse du département, la carte indique si le logement est **éligible**, **raccordable à la demande** ou **pas encore éligible**, et quel opérateur déploie le réseau dans le secteur (Hérault Très Haut Débit, Orange ou XpFibre/SFR).

## Fonctionnalités

- Vue d'ensemble par commune : une bulle par commune, dont la taille dépend du nombre d'immeubles et la couleur de la part d'immeubles éligibles.
- Affichage de chaque immeuble (environ 435 000) dès qu'on zoome sur un quartier ou qu'on sélectionne une commune.
- Fiche par immeuble : statut, adresse, opérateur, point de mutualisation, date de mise à jour, lien vers les opérateurs commerciaux.
- Recherche d'adresse avec l'autocomplétion de la Géoplateforme IGN.
- Filtres par statut et par zone de déploiement, avec statistiques recalculées pour le département ou la commune choisie.
- Fonds de carte Plan IGN et photographies aériennes IGN, plus quatre fonds Esri (plan, topographie, imagerie satellite, gris clair).

## Fonctionnement

Le site est entièrement statique (HTML, CSS, JavaScript) et ne nécessite aucun serveur ni base de données.

| Besoin | Source |
|---|---|
| Immeubles et statuts | API Opendatasoft de [Hérault Data](https://www.herault-data.fr/explore/dataset/deploiement-hd-thd-ipe-immeuble-herault/) (requêtes ODSQL) |
| Centres et contours des communes | [API Découpage administratif](https://geo.api.gouv.fr/) |
| Recherche d'adresse | [Géoplateforme IGN – géocodage](https://geoservices.ign.fr/documentation/services/services-geoplateforme/geocodage) |
| Fonds de carte | Géoplateforme IGN (WMTS), Esri (ArcGIS Online) |

Les statistiques sont calculées par l'API (`group_by` et `count(*)`). Les immeubles sont chargés uniquement pour l'emprise visible (`in_bbox`), ce qui garde la carte fluide malgré le volume de données.

## Lancer en local

```bash
git clone https://github.com/mawa399/fibre-THD-herault.git
cd fibre-THD-herault
python -m http.server 8000
```

Puis ouvrir http://localhost:8000.

## Historique

La première version de ce projet a été réalisée en 2023 pendant mon alternance au Conseil départemental de l'Hérault, dans le cadre de la Licence professionnelle SIG Web (IUT de Carcassonne). Elle reposait sur PHP, PostgreSQL/PostGIS, jQuery et Leaflet. Son code, nettoyé, est conservé dans le dossier [`version-2023`](version-2023/).

Cette nouvelle version reprend le projet en interrogeant directement l'API open data du Département, sans serveur ni base de données.

## Données

Données « IPE – Déploiement du très haut débit par immeuble », Conseil départemental de l'Hérault, sous Licence Ouverte / Open Licence (Etalab). Dernière mise à jour du jeu : 20 mars 2025.

## Auteur

Mawa DIAW, géomaticien / développeur SIG – [LinkedIn](https://www.linkedin.com/in/mawa-diaw)
