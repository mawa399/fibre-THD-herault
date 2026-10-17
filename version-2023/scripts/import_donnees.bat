@echo off
REM Importe les données dans la base "deploiement" avec ogr2ogr (GDAL).
REM À lancer depuis l'OSGeo4W Shell (installé avec QGIS), à la racine du projet.
REM Avant : set PGPASSWORD=votre_mot_de_passe

set PG=PG:host=localhost port=5432 dbname=deploiement user=postgres
set IPE=https://www.herault-data.fr/api/explore/v2.1/catalog/datasets/deploiement-hd-thd-ipe-immeuble-herault/exports/geojson
set WFS=WFS:https://data.geopf.fr/wfs/ows

echo 1/3 Immeubles (Herault Data)...
ogr2ogr -f PostgreSQL "%PG%" "%IPE%" -nln ipe_immeuble -t_srs EPSG:4326 -lco GEOMETRY_NAME=geom -lco FID=id -overwrite -progress

echo 2/3 Communes (IGN ADMIN EXPRESS)...
ogr2ogr -f PostgreSQL "%PG%" "%WFS%" "ADMINEXPRESS-COG.LATEST:commune" -where "code_insee_du_departement='34'" -nln admin_commune -t_srs EPSG:4326 -nlt PROMOTE_TO_MULTI -lco GEOMETRY_NAME=geom -overwrite

echo 3/3 Cantons (IGN ADMIN EXPRESS)...
ogr2ogr -f PostgreSQL "%PG%" "%WFS%" "ADMINEXPRESS-COG.LATEST:canton" -where "code_insee_du_departement='34'" -nln admin_canton -t_srs EPSG:4326 -nlt PROMOTE_TO_MULTI -lco GEOMETRY_NAME=geom -overwrite

echo Import termine. Lancez ensuite : psql -U postgres -d deploiement -f sql\02_vues.sql
