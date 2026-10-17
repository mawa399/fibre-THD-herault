#!/usr/bin/env bash
# Importe les données dans la base "deploiement" avec ogr2ogr (GDAL).
# Usage : PGPASSWORD=motdepasse ./scripts/import_donnees.sh
set -euo pipefail

PG="PG:host=${PGHOST:-localhost} port=${PGPORT:-5432} dbname=${PGDATABASE:-deploiement} user=${PGUSER:-postgres}"
IPE="https://www.herault-data.fr/api/explore/v2.1/catalog/datasets/deploiement-hd-thd-ipe-immeuble-herault/exports/geojson"
WFS="WFS:https://data.geopf.fr/wfs/ows"

echo "1/3 Immeubles (Hérault Data)…"
ogr2ogr -f PostgreSQL "$PG" "$IPE" -nln ipe_immeuble -t_srs EPSG:4326 \
  -lco GEOMETRY_NAME=geom -lco FID=id -overwrite -progress

echo "2/3 Communes (IGN ADMIN EXPRESS)…"
ogr2ogr -f PostgreSQL "$PG" "$WFS" "ADMINEXPRESS-COG.LATEST:commune" \
  -where "code_insee_du_departement='34'" -nln admin_commune -t_srs EPSG:4326 \
  -nlt PROMOTE_TO_MULTI -lco GEOMETRY_NAME=geom -overwrite

echo "3/3 Cantons (IGN ADMIN EXPRESS)…"
ogr2ogr -f PostgreSQL "$PG" "$WFS" "ADMINEXPRESS-COG.LATEST:canton" \
  -where "code_insee_du_departement='34'" -nln admin_canton -t_srs EPSG:4326 \
  -nlt PROMOTE_TO_MULTI -lco GEOMETRY_NAME=geom -overwrite

echo "Import terminé. Lancez ensuite : psql -d deploiement -f sql/02_vues.sql"
