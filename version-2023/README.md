# Éligibilité des immeubles à la fibre optique – Hérault (version 2023)

Carte web interactive réalisée pendant mon alternance au Conseil départemental de l'Hérault (2022-2023), dans le cadre de la Licence professionnelle SIG Web de l'IUT de Carcassonne.

Pour chaque immeuble de l'Hérault, la carte indique s'il est **éligible**, **éligible – raccordable à la demande** ou **non encore éligible** à la fibre, avec son adresse, sa zone de déploiement et les liens utiles pour le raccordement.

> La version actuelle du projet, sans serveur et branchée directement sur l'API open data du Département, se trouve à la [racine du dépôt](../README.md).

## Architecture

```
Navigateur (Leaflet + jQuery)
        │  AJAX : php/couches.php?nom=…&bbox=…
        ▼
Service PHP (PDO)  ──►  PostgreSQL / PostGIS (base « deploiement »)
                         ├── ipe_immeuble    immeubles et éligibilité
                         ├── admin_commune   communes
                         └── admin_canton    cantons
```

- **Front** : Leaflet, jQuery, contrôle des couches, légende, recherche d'adresse, impression de la carte.
- **Back** : un service PHP qui renvoie chaque couche en GeoJSON, construit directement en SQL avec `json_build_object` et `ST_AsGeoJSON`.
- **Base** : PostGIS, avec une vue par statut d'éligibilité (`eligible`, `eligible_racc_a_la_demande`, `non_encore_eligible`) et des vues `canton` et `commune`.
- Les immeubles sont chargés uniquement pour l'emprise visible de la carte, à partir du zoom 15.

## Contenu du dépôt

| Dossier | Contenu |
|---|---|
| `index.html`, `apropos.html` | pages du site |
| `js/script.js` | carte Leaflet et appels au service |
| `css/style.css` | mise en page |
| `php/couches.php` | service GeoJSON |
| `php/config.example.php` | modèle de configuration de la base |
| `sql/` | création de la base et des vues |
| `scripts/` | import des données avec ogr2ogr (Windows et Linux/macOS) |
| `data/zones/` | zones de déploiement THD (GeoJSON, juillet 2023) |

## Installation

Prérequis : PostgreSQL avec PostGIS, PHP 8 avec l'extension `pdo_pgsql`, GDAL/ogr2ogr (fourni avec QGIS via l'OSGeo4W Shell).

1. **Créer la base**
   ```bash
   psql -U postgres -f sql/01_creation_base.sql
   ```
2. **Importer les données** (immeubles depuis Hérault Data, communes et cantons depuis l'IGN)
   ```bash
   # Windows, depuis l'OSGeo4W Shell
   set PGPASSWORD=votre_mot_de_passe
   scripts\import_donnees.bat

   # Linux / macOS
   PGPASSWORD=votre_mot_de_passe ./scripts/import_donnees.sh
   ```
3. **Créer les vues**
   ```bash
   psql -U postgres -d deploiement -f sql/02_vues.sql
   ```
4. **Configurer la connexion** : copier `php/config.example.php` en `php/config.php` et renseigner le mot de passe. Ce fichier est exclu du dépôt par `.gitignore`.
5. **Lancer le site**
   ```bash
   cd version-2023
   php -S localhost:8000
   ```
   puis ouvrir http://localhost:8000.

## Données

- Immeubles : « IPE – Déploiement du très haut débit par immeuble », Conseil départemental de l'Hérault, [Hérault Data](https://www.herault-data.fr/explore/dataset/deploiement-hd-thd-ipe-immeuble-herault/), Licence Ouverte / Open Licence (Etalab).
- Zones de déploiement (`data/zones/`) : Conseil départemental de l'Hérault, Hérault Data, état de juillet 2023, Licence Ouverte.
- Communes et cantons : IGN, ADMIN EXPRESS COG, Licence Ouverte.

## Auteur

Mawa DIAW – géomaticien / développeur SIG – [LinkedIn](https://www.linkedin.com/in/mawa-diaw)
