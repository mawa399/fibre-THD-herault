-- Création de la base et de l'extension spatiale.
-- À lancer avec un compte administrateur PostgreSQL :
--   psql -U postgres -f sql/01_creation_base.sql

CREATE DATABASE deploiement;
\connect deploiement
CREATE EXTENSION IF NOT EXISTS postgis;
