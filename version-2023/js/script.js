$(document).ready(function() {
    var map = L.map('map').setView([43.541788012382185, 3.551299041693977], 9);

    IControl = L.control.layers().addTo(map);

    // Ajouter le fond de plan OpenStreetMap (OSM) par défaut
    var osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
    }).addTo(map);
    IControl.addBaseLayer(osmLayer, "OpenStreetMap");

    // Ajouter le fond de plan satellite
    fondSatellite = L.tileLayer('https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}', {
        maxZoom: 20
    });
    IControl.addBaseLayer(fondSatellite, "fond Satellite");

    // Ajout fond de plan terrain
    fondTerrain = L.tileLayer('https://mt0.google.com/vt/lyrs=p&hl=en&x={x}&y={y}&z={z}', {
        maxZoom: 20
    });
    IControl.addBaseLayer(fondTerrain, "fond terrain");

    function pointToLayerGreen(feature, latlng) {
        return L.circleMarker(latlng, {
            radius: 6,
            fillColor: "green",
            color: "black",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        });
    }

    function pointToLayerRed(feature, latlng) {
        return L.circleMarker(latlng, {
            radius: 6,
            fillColor: "red",
            color: "black",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        });
    }

    function pointToLayerOrange(feature, latlng) {
        return L.circleMarker(latlng, {
            radius: 6,
            fillColor: "orange",
            color: "black",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        });
    }

    $.getJSON(
        "./php/couches.php?nom=canton", {},
        function(data) {
            Vcantons = L.geoJSON(data, {
                style: function(feature) {
                    return {
                        fillColor: "none",
                        color: "blue",
                        weight: 3
                    }
                },
                onEachFeature: function(feature, layer) {
                    contenu = "<b>Code canton : </b>" + feature.properties.code_canton + "<br>";
                    contenu += "<b>Nom : </b>" + feature.properties.canton;
                    layer.bindPopup(contenu, { closeButton: false });
                }
            });

            Vcantons.addTo(map);
            IControl.addOverlay(Vcantons, "cantons");
        }
    );

    


    $.getJSON(
        "./php/couches.php?nom=commune", {},
        function(data) {
            Vcommunes = L.geoJSON(data, {
                style: function(feature) {
                    return {
                        fillColor: "none",
                        color: "black",
                        weight: 1
                    }
                },
                onEachFeature: function(feature, layer) {
                    contenu = "<b>Code commune : </b>" + feature.properties.code_com + "<br>";
                    contenu += "<b>Nom : </b>" + feature.properties.nom_officiel_commune;
                    layer.bindPopup(contenu, { closeButton: false });
                }
            });

            // Ajouter Vcommunes au contrôle des couches, mais PAS à la carte par défaut.
            IControl.addOverlay(Vcommunes, "communes");

            // Écouter l'événement overlayadd sur la carte pour ajouter la couche "communes" à la carte lorsque l'utilisateur coche le contrôle des couches.
            map.on('overlayadd', function(eventLayer) {
                if (eventLayer.name === 'communes') {
                    map.addLayer(Vcommunes);
                }
            });

            // Écouter l'événement overlayremove sur la carte pour retirer la couche "communes" de la carte lorsque l'utilisateur décoche le contrôle des couches.
            map.on('overlayremove', function(eventLayer) {
                if (eventLayer.name === 'communes') {
                    map.removeLayer(Vcommunes);
                }
            });
        }
    );

    $.getJSON(
        "./php/couches.php?nom=eligible_racc_a_la_demande", {},
        function(data) {
            Veligible_racc_a_la_demande = L.geoJSON(data, {
                pointToLayer: pointToLayerOrange,
                onEachFeature: function(feature, layer) {
                    contenu = "<b>id : </b>" + feature.properties.id + "<br>";
                    contenu += "<b>Éligibilité : </b>" + feature.properties.eligibilite;
                    layer.bindPopup(contenu, { closeButton: false });
                }
            });

            $.getJSON(
    "./php/couches.php?nom=eligible_racc_a_la_demande", {},
    function(data) {
        Veligible_racc_a_la_demande = L.geoJSON(data, {
            pointToLayer: pointToLayerOrange,
            onEachFeature: function(feature, layer) {
                layer.bindPopup(createCustomPopupContent(feature), { closeButton: false });
            }
        });

        Veligible_racc_a_la_demande.addTo(map);
        IControl.addOverlay(Veligible_racc_a_la_demande, "Logement Éligible - Raccordable à la demande");
    }
);

function createCustomPopupContent(feature) {
    var popupContent = '<div class="popup-content">';
    popupContent += '<div class="popup-header">';
    popupContent += '<img src="' + feature.properties.logo + '" alt="Image" class="popup-image">';
    popupContent += '<h2>' + feature.properties.eligibilite + '</h2>';
    popupContent += '</div>';
    popupContent += '<div class="popup-details">';
    popupContent += '<img src="./images/adresse.png" alt="Adresse" class="popup-icon">';
    popupContent += '<p><b>Adresse complète: </b>' + feature.properties.adresse_complete + '</p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<img src="./images/immeuble.png" alt="Immeuble" class="popup-icon">';
    popupContent += '<p><b>Identifiant immeuble: </b>' + feature.properties.identifiant_immeuble + '</p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<img src="./images/immeuble.png" alt="Immeuble" class="popup-icon">';
    popupContent += '<p><b>Zone: </b>' + feature.properties.zone + '</p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<h4><a href="' + feature.properties.hyperlienoperateurs + '" target="_blank">' + feature.properties.operateurs + '</a></h4>'; 
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<img src="./images/date.jpg" alt="Date" class="popup-icon">';
    popupContent += '<p><b>Date de mise à jour: </b>' + feature.properties.date_de_mise_a_jour + '</p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<img src="./images/interrogation.png" alt="Date" class="popup-icon">';
    popupContent += '<p><b><h6><a href="https://numerique.herault.fr/uploads/Document/4e/5060_957_Guide-Raccordement.pdf" target="_blank">' + feature.properties.pdf +'</a></h6></b></p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<p><b><h6><a href="https://numerique.herault.fr/1097-les-reseaux-fixes.htm#par8594" target="_blank">' + feature.properties.paragraphe_explicatif_delai +'</a></h6></b></p>';
    popupContent += '</div>';

    return popupContent;
}


            Veligible_racc_a_la_demande.addTo(map);
            IControl.addOverlay(Veligible_racc_a_la_demande, "Logement Éligible - Raccordable à la demande");
        }
    );



    $.getJSON(
        "./php/couches.php?nom=non_encore_eligible", {},
        function(data) {
            Vnon_encore_eligible = L.geoJSON(data, {
                pointToLayer: pointToLayerRed,
                onEachFeature: function(feature, layer) {
                    layer.bindPopup(contenu, { closeButton: false });
                }
            });
            $.getJSON(
    "./php/couches.php?nom=non_encore_eligible", {},
    function(data) {
        Vnon_encore_eligible = L.geoJSON(data, {
            pointToLayer: pointToLayerRed,
            onEachFeature: function(feature, layer) {
                layer.bindPopup(createCustomPopupContentNonEligible(feature), { closeButton: false });
            }
        });

        Vnon_encore_eligible.addTo(map);
        IControl.addOverlay(Vnon_encore_eligible, "Logement non Encore Éligible");
    }
);

function createCustomPopupContentNonEligible(feature) {
    var popupContent = '<div class="popup-content">';
    popupContent += '<div class="popup-header">';
    popupContent += '<img src="' + feature.properties.logo + '" alt="Image" class="popup-image">';
    popupContent += '<h2>' + feature.properties.eligibilite + '</h2>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<h5>' + feature.properties.commentaire + '</h5>';
    popupContent += '</div>';
    popupContent += '<div class="popup-details">';
    popupContent += '<img src="./images/adresse.png" alt="Adresse" class="popup-icon">';
    popupContent += '<p><b>Adresse complète: </b>' + feature.properties.adresse_complete + '</p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<img src="./images/immeuble.png" alt="Immeuble" class="popup-icon">';
    popupContent += '<p><b>Identifiant immeuble: </b>' + feature.properties.identifiant_immeuble + '</p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<img src="./images/immeuble.png" alt="Immeuble" class="popup-icon">';
    popupContent += '<p><b>Zone: </b>' + feature.properties.zone + '</p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<img src="./images/date.jpg" alt="Date" class="popup-icon">';
    popupContent += '<p><b>Date de mise à jour: </b>' + feature.properties.date_de_mise_a_jour + '</p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<img src="./images/interrogation.png" alt="Date" class="popup-icon">';
    popupContent += '<p><b><h6><a href="https://numerique.herault.fr/uploads/Document/4e/5060_957_Guide-Raccordement.pdf" target="_blank">Comment bien préparer son raccordement?</a></h6></b></p>';
    popupContent += '</div>';
    return popupContent;
}


            Vnon_encore_eligible.addTo(map);
            IControl.addOverlay(Vnon_encore_eligible, "Logement non Encore Éligible");
        }
    );

   $.getJSON(
    "./php/couches.php?nom=eligible", {},
    function(data) {
        Veligible = L.geoJSON(data, {
            pointToLayer: pointToLayerGreen,
            onEachFeature: function(feature, layer) {
                layer.bindPopup(createCustomPopupContent(feature), { closeButton: false });
            }
        });

    function createCustomPopupContent(feature) {
    var popupContent = '<div class="popup-content">';
    popupContent += '<div class="popup-header">';
    popupContent += '<img src="' + feature.properties.logo + '" alt="Image" class="popup-image">';
    popupContent += '<h2>' + feature.properties.eligibilite + '</h2>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<h5>' + feature.properties.commentaire + '</h5>';
    popupContent += '</div>';
    popupContent += '<div class="popup-details">';
    popupContent += '<img src="./images/adresse.png" alt="Adresse" class="popup-icon">';
    popupContent += '<p><b>Adresse complète: </b>' + feature.properties.adresse_complete + '</p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<img src="./images/immeuble.png" alt="Immeuble" class="popup-icon">';
    popupContent += '<p><b>Identifiant immeuble: </b>' + feature.properties.identifiant_immeuble + '</p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<img src="./images/immeuble.png" alt="Immeuble" class="popup-icon">';
    popupContent += '<p><b>Zone: </b>' + feature.properties.zone + '</p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<h4><a href="' + feature.properties.hyperlienoperateurs + '" target="_blank">' + feature.properties.operateurs + '</a></h4>'; 
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<img src="./images/date.jpg" alt="Date" class="popup-icon">';
    popupContent += '<p><b>Date de mise à jour: </b>' + feature.properties.date_de_mise_a_jour + '</p>';
    popupContent += '</div>';
    popupContent += '<br><div class="popup-details">';
    popupContent += '<img src="./images/interrogation.png" alt="Date" class="popup-icon">';
    popupContent += '<p><b><h6><a href="https://numerique.herault.fr/uploads/Document/4e/5060_957_Guide-Raccordement.pdf" target="_blank">Comment bien préparer son raccordement?</a></h6></b></p>';
    popupContent += '</div>';
    return popupContent;
}




            Veligible.addTo(map);
            IControl.addOverlay(Veligible, "Logement Éligible");
        }
    );




    // Function to create the legend
    function createLegend() {
        var legend = L.control({ position: 'bottomright' });

        legend.onAdd = function (map) {
            var div = L.DomUtil.create('div', 'info legend');
            var labels = ['Logements Éligibles', 'Logements Non Encore Éligibles', 'Logements Éligibles Raccordable à la Demande'];
            var colors = ['green', 'red', 'orange'];

            // Loop through the labels and create the legend items with colored symbols
            for (var i = 0; i < labels.length; i++) {
                div.innerHTML +=
                    '<i class="legend-icon" style="background:' + colors[i] + '"></i> ' + labels[i] + '<br>';
            }

            return div;
        };

        legend.addTo(map);
    }

    // Call the function to create the legend
    createLegend();

//ajout de l'outl Print pour imprimer
L.control.browserPrint({position: 'topleft', title: 'Print ...'}).addTo(map);

// Ajout de l'outil Zoom

// Créez le contrôle de recherche d'adresses avec le fournisseur Esri ArcGIS Online
var searchControl = L.esri.Geocoding.geosearch({
    providers: [
        L.esri.Geocoding.arcgisOnlineProvider({
            apikey: 'VOTRE_CLE_API_ARCGIS'
        })
    ]
}).addTo(map);

// Créez un groupe de couches vide pour stocker les résultats et ajoutez-le à la carte
var results = L.layerGroup().addTo(map);

// Écoutez l'événement de résultats et ajoutez chaque résultat à la carte avec un marqueur
searchControl.on("results", function (data) {
    results.clearLayers();
    for (var i = data.results.length - 1; i >= 0; i--) {
        var result = data.results[i];
        var marker = L.marker(result.latlng).addTo(results);
        marker.bindPopup(result.text).openPopup(); // Vous pouvez personnaliser le contenu du popup si vous le souhaitez
    }
});

// Ajoutez le contrôle de recherche d'adresses au conteneur spécifié dans votre index.html
var searchContainer = document.getElementById("search-container");
searchContainer.appendChild(searchControl.onAdd(map));


});

