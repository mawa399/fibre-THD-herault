<?php
/**
 * Service de couches GeoJSON pour la carte d'éligibilité à la fibre.
 *
 * Usage : php/couches.php?nom=<couche>[&bbox=ouest,sud,est,nord]
 * Couches disponibles : canton, commune, eligible, eligible_racc_a_la_demande, non_encore_eligible.
 * Pour les couches d'immeubles, le paramètre bbox limite la requête à l'emprise visible de la carte.
 */

header('Content-Type: application/json; charset=utf-8');

// Couches publiées : table (ou vue) PostGIS et colonnes renvoyées dans les propriétés.
const COUCHES = [
    'canton' => [
        'table'    => 'canton',
        'colonnes' => ['code_canton', 'canton'],
        'points'   => false,
    ],
    'commune' => [
        'table'    => 'commune',
        'colonnes' => ['code_com', 'nom_officiel_commune'],
        'points'   => false,
    ],
    'eligible' => [
        'table'    => 'eligible',
        'colonnes' => ['id', 'eligibilite', 'commentaire', 'adresse_complete', 'identifiant_immeuble',
                       'operateurs', 'hyperlienoperateurs', 'zone', 'logo', 'pdf', 'date_de_mise_a_jour'],
        'points'   => true,
    ],
    'eligible_racc_a_la_demande' => [
        'table'    => 'eligible_racc_a_la_demande',
        'colonnes' => ['id', 'eligibilite', 'adresse_complete', 'identifiant_immeuble', 'zone', 'logo', 'pdf',
                       'paragraphe_explicatif_delai', 'operateurs', 'hyperlienoperateurs', 'date_de_mise_a_jour'],
        'points'   => true,
    ],
    'non_encore_eligible' => [
        'table'    => 'non_encore_eligible',
        'colonnes' => ['id', 'eligibilite', 'commentaire', 'adresse_complete', 'identifiant_immeuble',
                       'zone', 'logo', 'date_de_mise_a_jour'],
        'points'   => true,
    ],
];

function repondreErreur(int $code, string $message): void
{
    http_response_code($code);
    echo json_encode(['erreur' => $message], JSON_UNESCAPED_UNICODE);
    exit;
}

// ---------- Paramètres ----------
$nom = $_GET['nom'] ?? '';
if (!isset(COUCHES[$nom])) {
    repondreErreur(400, 'Couche inconnue. Valeurs possibles : ' . implode(', ', array_keys(COUCHES)));
}
$couche = COUCHES[$nom];

$bbox = null;
if (!empty($_GET['bbox'])) {
    $valeurs = array_map('floatval', explode(',', $_GET['bbox']));
    if (count($valeurs) !== 4) {
        repondreErreur(400, 'Le paramètre bbox doit contenir 4 valeurs : ouest,sud,est,nord.');
    }
    $bbox = $valeurs;
}

// ---------- Connexion ----------
$configFichier = __DIR__ . '/config.php';
if (!is_file($configFichier)) {
    repondreErreur(500, 'Fichier php/config.php manquant : copiez config.example.php et renseignez vos paramètres.');
}
$config = require $configFichier;

try {
    $dsn = sprintf('pgsql:host=%s;port=%d;dbname=%s', $config['host'], $config['port'], $config['dbname']);
    $db = new PDO($dsn, $config['user'], $config['password'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
} catch (PDOException $e) {
    error_log($e->getMessage());
    repondreErreur(500, 'Connexion à la base de données impossible.');
}

// ---------- Requête ----------
// Les noms de table et de colonnes viennent de la liste COUCHES ci-dessus, jamais de l'URL.
$proprietes = implode(', ', array_map(fn($c) => "'$c', $c", $couche['colonnes']));
$sql = "SELECT json_build_object(
            'type', 'FeatureCollection',
            'features', COALESCE(json_agg(json_build_object(
                'type', 'Feature',
                'geometry', ST_AsGeoJSON(geom, 6)::json,
                'properties', json_build_object($proprietes)
            )), '[]'::json)
        ) AS geojson
        FROM (SELECT * FROM {$couche['table']}";

$params = [];
if ($couche['points']) {
    if ($bbox === null) {
        repondreErreur(400, 'Le paramètre bbox est obligatoire pour les couches d\'immeubles.');
    }
    $sql .= ' WHERE geom && ST_MakeEnvelope(:ouest, :sud, :est, :nord, 4326)';
    $params = ['ouest' => $bbox[0], 'sud' => $bbox[1], 'est' => $bbox[2], 'nord' => $bbox[3]];
    $sql .= ' LIMIT ' . (int) ($config['limite_immeubles'] ?? 5000);
}
$sql .= ') AS t;';

try {
    $requete = $db->prepare($sql);
    $requete->execute($params);
    echo $requete->fetchColumn();
} catch (PDOException $e) {
    error_log($e->getMessage());
    repondreErreur(500, 'Erreur lors de la lecture de la couche.');
}
