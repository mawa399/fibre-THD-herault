/*
 * Carte d'éligibilité des immeubles de l'Hérault à la fibre optique (version 2023).
 * Leaflet + jQuery côté client, PHP + PostGIS côté serveur (php/couches.php).
 */
$(function () {
    "use strict";

    // Zoom à partir duquel les immeubles sont chargés (emprise visible uniquement).
    var ZOOM_IMMEUBLES = 15;
    var HERAULT_DATA = "https://www.herault-data.fr";
    var GUIDE_RACCORDEMENT = "https://numerique.herault.fr/uploads/Document/4e/5060_957_Guide-Raccordement.pdf";
    var PAGE_DELAIS = "https://numerique.herault.fr/1097-les-reseaux-fixes.htm#par8594";

    // ---------- Carte et fonds de plan ----------
    var map = L.map("map").setView([43.54, 3.55], 9);

    var fonds = {
        "Plan IGN": L.tileLayer("https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", {
            maxZoom: 19,
            attribution: "&copy; IGN"
        }).addTo(map),
        "Photographies aériennes": L.tileLayer("https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}", {
            maxZoom: 19,
            attribution: "&copy; IGN"
        }),
        "Esri – Plan": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, attribution: "Tiles &copy; Esri" }),
        "Esri – Topographie": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, attribution: "Tiles &copy; Esri" }),
        "Esri – Imagerie satellite": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, attribution: "Tiles &copy; Esri – Maxar, Earthstar Geographics" }),
        "Esri – Gris clair": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 16, attribution: "Tiles &copy; Esri" })
    };
    var controleCouches = L.control.layers(fonds, null, { collapsed: window.innerWidth < 768 }).addTo(map);

    // ---------- Outils ----------
    L.control.browserPrint({ position: "topleft", title: "Imprimer la carte" }).addTo(map);

    L.Control.geocoder({
        defaultMarkGeocode: true,
        placeholder: "Rechercher une adresse…",
        errorMessage: "Adresse introuvable",
        geocoder: L.Control.Geocoder.nominatim({ geocodingQueryParams: { countrycodes: "fr" } })
    }).addTo(map);

    // ---------- Utilitaires ----------
    function echapper(texte) {
        return String(texte == null ? "" : texte).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function urlLogo(logo) {
        if (!logo) return null;
        return logo.charAt(0) === "/" ? HERAULT_DATA + encodeURI(logo) : logo;
    }

    function ligne(libelle, valeur) {
        return valeur ? "<p><b>" + libelle + " : </b>" + echapper(valeur) + "</p>" : "";
    }

    function lien(url, texte) {
        return url && texte ? '<p class="popup-link"><a href="' + echapper(url) + '" target="_blank" rel="noopener">' + echapper(texte) + "</a></p>" : "";
    }

    // Une seule fonction pour les fenêtres d'information des trois catégories d'immeubles.
    function contenuPopup(p) {
        var logo = urlLogo(p.logo);
        var html = '<div class="popup-content">';
        html += '<div class="popup-header">';
        if (logo) html += '<img src="' + echapper(logo) + '" alt="" class="popup-image">';
        html += "<h2>" + echapper(p.eligibilite) + "</h2>";
        html += "</div>";
        if (p.commentaire) html += "<h5>" + echapper(p.commentaire) + "</h5>";
        html += ligne("Adresse complète", p.adresse_complete);
        html += ligne("Identifiant immeuble", p.identifiant_immeuble);
        html += ligne("Zone", p.zone);
        html += ligne("Date de mise à jour", p.date_de_mise_a_jour);
        if (p.hyperlienoperateurs && /^https?:\/\//.test(p.hyperlienoperateurs)) {
            html += lien(p.hyperlienoperateurs, p.operateurs || "Consulter les opérateurs disponibles");
        }
        html += lien(GUIDE_RACCORDEMENT, p.pdf || "Comment bien préparer son raccordement ?");
        html += lien(PAGE_DELAIS, p.paragraphe_explicatif_delai);
        html += "</div>";
        return html;
    }

    // ---------- Limites administratives ----------
    function chargerLimites(nom, libelle, style, contenu, afficher) {
        $.getJSON("php/couches.php", { nom: nom }, function (data) {
            var couche = L.geoJSON(data, {
                style: style,
                onEachFeature: function (feature, layer) {
                    layer.bindPopup(contenu(feature.properties), { closeButton: false });
                }
            });
            if (afficher) couche.addTo(map);
            controleCouches.addOverlay(couche, libelle);
        });
    }

    chargerLimites("canton", "Cantons",
        { fill: false, color: "blue", weight: 3 },
        function (p) { return "<b>Code canton : </b>" + echapper(p.code_canton) + "<br><b>Nom : </b>" + echapper(p.canton); },
        true);

    chargerLimites("commune", "Communes",
        { fill: false, color: "black", weight: 1 },
        function (p) { return "<b>Code commune : </b>" + echapper(p.code_com) + "<br><b>Nom : </b>" + echapper(p.nom_officiel_commune); },
        false);

    // ---------- Zones de déploiement (fichiers GeoJSON du dossier data/zones) ----------
    var ZONES = [
        { fichier: "zone_eligible_1gbps", libelle: "Zone éligible 1 Gbit/s", couleur: "#2e7d32" },
        { fichier: "zone_bientot_eligible_1gbps", libelle: "Zone bientôt éligible 1 Gbit/s", couleur: "#f9a825" },
        { fichier: "zone_30mbps_bientot_eligible_1gbps", libelle: "Haut débit 30 Mbit/s, bientôt éligible 1 Gbit/s", couleur: "#ef6c00" },
        { fichier: "zone_initiative_privee", libelle: "Zone d'initiative privée", couleur: "#6a1b9a" }
    ];

    // Les fichiers sont chargés en parallèle, puis ajoutés au contrôle dans l'ordre de la liste.
    $.when.apply($, ZONES.map(function (zone) {
        return $.getJSON("data/zones/" + zone.fichier + ".geojson");
    })).done(function () {
        var reponses = arguments;
        ZONES.forEach(function (zone, i) {
            var data = reponses[i][0];
            var couche = L.geoJSON(data, {
                style: { color: zone.couleur, weight: 1, fillOpacity: 0.25 },
                onEachFeature: function (feature, layer) {
                    var p = feature.properties;
                    layer.bindPopup(
                        "<b>" + echapper(p.etat) + "</b><br>" + echapper(p.constructeur) +
                        (p.commentaire ? "<br><i>" + echapper(p.commentaire) + "</i>" : "") +
                        "<br><small>Mise à jour : " + echapper(p.date_de_mise_a_jour) + "</small>",
                        { closeButton: false }
                    );
                }
            });
            controleCouches.addOverlay(couche, zone.libelle);
        });
    });

    // ---------- Immeubles (chargés selon l'emprise visible) ----------
    var CATEGORIES = [
        { nom: "eligible", libelle: "Logements éligibles", couleur: "green" },
        { nom: "eligible_racc_a_la_demande", libelle: "Logements éligibles – raccordables à la demande", couleur: "orange" },
        { nom: "non_encore_eligible", libelle: "Logements non encore éligibles", couleur: "red" }
    ];

    CATEGORIES.forEach(function (cat) {
        cat.couche = L.geoJSON(null, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng, {
                    radius: 6, fillColor: cat.couleur, color: "black", weight: 1, opacity: 1, fillOpacity: 0.8
                });
            },
            onEachFeature: function (feature, layer) {
                layer.bindPopup(contenuPopup(feature.properties), { closeButton: false, maxWidth: 360 });
            }
        }).addTo(map);
        controleCouches.addOverlay(cat.couche, cat.libelle);
    });

    function chargerImmeubles() {
        if (map.getZoom() < ZOOM_IMMEUBLES) {
            CATEGORIES.forEach(function (cat) { cat.couche.clearLayers(); });
            return;
        }
        var b = map.getBounds();
        var bbox = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()].map(function (v) { return v.toFixed(6); }).join(",");
        CATEGORIES.forEach(function (cat) {
            $.getJSON("php/couches.php", { nom: cat.nom, bbox: bbox }, function (data) {
                cat.couche.clearLayers();
                cat.couche.addData(data);
            });
        });
    }
    map.on("moveend", chargerImmeubles);

    // ---------- Légende ----------
    var legende = L.control({ position: "bottomright" });
    legende.onAdd = function () {
        var div = L.DomUtil.create("div", "info legend");
        div.innerHTML = CATEGORIES.map(function (cat) {
            return '<i class="legend-icon" style="background:' + cat.couleur + '"></i>' + cat.libelle;
        }).join("<br>") + '<br><small>Zoomez pour afficher les immeubles.</small>';
        return div;
    };
    legende.addTo(map);
});
