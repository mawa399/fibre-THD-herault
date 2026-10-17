<?php
// Copiez ce fichier en config.php et renseignez vos paramètres de connexion.
// config.php est ignoré par Git : vos identifiants ne sont jamais publiés.
return [
    'host'             => 'localhost',
    'port'             => 5432,
    'dbname'           => 'deploiement',
    'user'             => 'postgres',
    'password'         => 'votre_mot_de_passe',
    'limite_immeubles' => 5000, // nombre maximal d'immeubles renvoyés par requête
];
