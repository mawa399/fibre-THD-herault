<?php
header('content-type:application/json');
try {
    $dbconn = new PDO("pgsql:host=localhost;dbname=deploiement;port=5432", "postgres", "MOT_DE_PASSE");
    
    $dbconn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $erreur) {
    $erreur->getMessage(); // Supprimer en production
    echo $erreur;
}

if ($_GET["nom"] == "canton") {
    // Exécution de la requête SQL
    $sql = "SELECT json_build_object(
                'type', 'FeatureCollection',
                'crs', json_build_object(
                    'type', 'EPSG:4326'
                ),
                'features', json_agg(
                    json_build_object(
                        'type', 'Feature',
                        'code_canton', code_canton,
                        'geometry', ST_AsGeoJSON(geom)::json,
                        'properties', json_build_object(
                            'code_canton', code_canton,
                            'canton', canton
                        )
                    )
                )
            ) AS objet_geojson FROM public.canton;";
    $req = $dbconn->prepare($sql);
    $req->execute();
    $data = $req->fetch();
    if ($data) {
        $objet_geojson = $data['objet_geojson'];
        echo $objet_geojson;
    }
}



if ($_GET["nom"] == "commune") {
    // Exécution de la requête SQL
    $sql = "SELECT json_build_object(
                'type', 'FeatureCollection',
                'crs', json_build_object(
                    'type', 'EPSG:4326'
                ),
                'features', json_agg(
                    json_build_object(
                        'type', 'Feature',
                        'code_com', code_com,
                        'geometry', ST_AsGeoJSON(geom)::json,
                        'properties', json_build_object(
                            'code_com', code_com,
                            'nom_officiel_commune', nom_officiel_commune
                        )
                    )
                )
            ) AS objet_geojson FROM public.commune;";
    $req = $dbconn->prepare($sql);
    $req->execute();
    $data = $req->fetch();
    if ($data) {
        $objet_geojson = $data['objet_geojson'];
        echo $objet_geojson;
    }
}



if ($_GET["nom"] == "eligible_racc_a_la_demande") {
    // Exécution de la requête SQL
    $sql = "SELECT json_build_object(
                'type', 'FeatureCollection',
                'crs', json_build_object(
                    'type', 'EPSG:4326'
                ),
                'features', json_agg(
                    json_build_object(
                        'type', 'Feature',
                        'id', id,
                        'geometry', ST_AsGeoJSON(geom)::json,
                        'properties', json_build_object(
                            'id', id,
                            'eligibilite', eligibilite,
                            'identifiant_immeuble', identifiant_immeuble,
                            'adresse_complete', adresse_complete,
                            'zone', zone,
                            'logo', logo,
                            'pdf', pdf,
                            'paragraphe_explicatif_delai', paragraphe_explicatif_delai,
                            'operateurs', operateurs,
                            'hyperlienoperateurs', hyperlienoperateurs,
                            'date_de_mise_a_jour', date_de_mise_a_jour
                        )
                    )
                )
            ) AS objet_geojson FROM public.eligible_racc_a_la_demande where id between 1 and 50 ;";
    $req = $dbconn->prepare($sql);
    $req->execute();
    $data = $req->fetch();
    if ($data) {
        $objet_geojson = $data['objet_geojson'];
        echo $objet_geojson;
    }
}

if ($_GET["nom"] == "non_encore_eligible") {
    // Exécution de la requête SQL
    $sql = "SELECT json_build_object(
                'type', 'FeatureCollection',
                'crs', json_build_object(
                    'type', 'EPSG:4326'
                ),
                'features', json_agg(
                    json_build_object(
                        'type', 'Feature',
                        'id', id,
                        'geometry', ST_AsGeoJSON(geom)::json,
                        'properties', json_build_object(
                            'id', id,
                            'eligibilite', eligibilite,
                            'commentaire', commentaire,
                            'adresse_complete', adresse_complete,
                            'identifiant_immeuble', identifiant_immeuble,
                            'date_de_mise_a_jour', date_de_mise_a_jour,
                            'logo', logo
                            
                        )
                    )
                )
            ) AS objet_geojson FROM public.non_encore_eligible where id between 11000 and 11500 ;";
    $req = $dbconn->prepare($sql);
    $req->execute();
    $data = $req->fetch();
    if ($data) {
        $objet_geojson = $data['objet_geojson'];
        echo $objet_geojson;
    }
}


if ($_GET["nom"] == "eligible") {
    // Exécution de la requête SQL
    $sql = "SELECT json_build_object(
                'type', 'FeatureCollection',
                'crs', json_build_object(
                    'type', 'EPSG:4326'
                ),
                'features', json_agg(
                    json_build_object(
                        'type', 'Feature',
                        'id', id,
                        'geometry', ST_AsGeoJSON(geom)::json,
                        'properties', json_build_object(
                            'id', id,
                            'eligibilite', eligibilite,
                            'commentaire', commentaire,
                            'adresse_complete', adresse_complete,
                            'identifiant_immeuble', identifiant_immeuble,
                            'operateurs', operateurs,
                            'zone', zone,
                            'date_de_mise_a_jour', date_de_mise_a_jour,
                            'logo',logo,
                            'hyperlienoperateurs',hyperlienoperateurs
                        )
                    )
                )
            ) AS objet_geojson FROM public.eligible where id between 50000 and 55000 ;";
    $req = $dbconn->prepare($sql);
    $req->execute();
    $data = $req->fetch();
    if ($data) {
        $objet_geojson = $data['objet_geojson'];
        echo $objet_geojson;
    }
}



?>
