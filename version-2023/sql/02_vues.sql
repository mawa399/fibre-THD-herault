-- Vues utilisées par php/couches.php.
-- À lancer après l'import des données (scripts/import_donnees) :
--   psql -U postgres -d deploiement -f sql/02_vues.sql
--
-- Tables importées :
--   ipe_immeuble    immeubles et éligibilité (Hérault Data, jeu « IPE – Déploiement du THD par immeuble »)
--   admin_commune   communes de l'Hérault (IGN, ADMIN EXPRESS COG)
--   admin_canton    cantons de l'Hérault (IGN, ADMIN EXPRESS COG)

-- Limites administratives
CREATE OR REPLACE VIEW canton AS
SELECT code_insee   AS code_canton,
       nom_officiel AS canton,
       geom
FROM admin_canton;

CREATE OR REPLACE VIEW commune AS
SELECT code_insee   AS code_com,
       nom_officiel AS nom_officiel_commune,
       geom
FROM admin_commune;

-- Immeubles, une vue par statut d'éligibilité
CREATE OR REPLACE VIEW eligible AS
SELECT * FROM ipe_immeuble WHERE eligibilite = 'ÉLIGIBLE';

CREATE OR REPLACE VIEW eligible_racc_a_la_demande AS
SELECT * FROM ipe_immeuble WHERE eligibilite = 'ÉLIGIBLE (Raccordable à la demande)';

CREATE OR REPLACE VIEW non_encore_eligible AS
SELECT * FROM ipe_immeuble WHERE eligibilite = 'NON ENCORE ÉLIGIBLE';

-- Index utiles aux requêtes de la carte
CREATE INDEX IF NOT EXISTS ipe_immeuble_eligibilite_idx ON ipe_immeuble (eligibilite);
CREATE INDEX IF NOT EXISTS ipe_immeuble_geom_idx ON ipe_immeuble USING gist (geom);
ANALYZE ipe_immeuble;
