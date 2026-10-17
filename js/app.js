/*
 * Fibre Hérault – carte d'éligibilité des immeubles à la fibre optique.
 * Données : API Opendatasoft du portail Hérault Data (aucune base locale).
 * Communes : API Découpage administratif (geo.api.gouv.fr).
 * Géocodage et fonds de carte : Géoplateforme IGN.
 */
(() => {
  "use strict";

  // ---------- Configuration ----------
  const DATASET = "https://www.herault-data.fr/api/explore/v2.1/catalog/datasets/deploiement-hd-thd-ipe-immeuble-herault";
  const ASSETS = "https://www.herault-data.fr";
  const GEO_API = "https://geo.api.gouv.fr";
  const GEOCODER = "https://data.geopf.fr/geocodage/search";

  const ZOOM_IMMEUBLES = 15;      // zoom à partir duquel on charge les immeubles de l'emprise visible
  const LIMITE_EMPRISE = 5000;    // nombre maximal d'immeubles chargés par emprise
  const LIMITE_COMMUNE = 8000;    // une commune plus petite est chargée en entier quand on la sélectionne

  const STATUTS = [
    { key: "ÉLIGIBLE", label: "Éligible", cls: "ok" },
    { key: "ÉLIGIBLE (Raccordable à la demande)", label: "Raccordable à la demande", cls: "dem" },
    { key: "NON ENCORE ÉLIGIBLE", label: "Pas encore éligible", cls: "non" },
  ];
  const ZONES = [
    { key: "Zone d'initiative publique (CD34) - Déploiement par la société Hérault Très Haut Débit", label: "Réseau public Hérault THD", logo: "/assets/theme_image/HN_CD34.jpg" },
    { key: "Zone d'initiative privée - Déploiement par l'opérateur ORANGE", label: "Orange", logo: "/assets/theme_image/orange.png" },
    { key: "Zone d'initiative privée - Déploiement par XpFibre/SFR", label: "XpFibre / SFR", logo: "/assets/theme_image/XPFIBRE_SFR.jpg" },
    { key: "Zone très dense", label: "Zone très dense", logo: "/assets/theme_image/Zone très dense.png" },
  ];
  const statutDe = (v) => STATUTS.find((s) => s.key === v) || STATUTS[2];
  const zoneDe = (v) => ZONES.find((z) => z.key === v);

  // ---------- État ----------
  const state = {
    statuts: new Set(STATUTS.map((s) => s.key)),
    zones: new Set(ZONES.map((z) => z.key)),
    commune: null,          // { nom, code, total }
    communes: [],           // [{ nom, code, lat, lon }]
    stats: new Map(),       // nom -> { total, ok, dem, non }
  };

  // ---------- Utilitaires ----------
  const $ = (sel) => document.querySelector(sel);
  const fmt = new Intl.NumberFormat("fr-FR");
  const pct = (a, b) => (b ? (100 * a) / b : 0);
  const fmtPct = (v) => (v > 0 && v < 0.1 ? "< 0,1" : (v >= 99.95 || v === 0 ? Math.round(v) : v.toFixed(1)).toString().replace(".", ",")) + " %";
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const quote = (v) => '"' + String(v).replace(/"/g, '\\"') + '"';
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  async function getJSON(url, signal) {
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error(`HTTP ${r.status} sur ${url}`);
    return r.json();
  }

  // Construit la clause ODSQL "where" à partir des filtres (et d'éventuelles conditions en plus).
  function where(extra = []) {
    const parts = [...extra];
    if (state.statuts.size < STATUTS.length) parts.push(`eligibilite IN (${[...state.statuts].map(quote).join(",") || '""'})`);
    if (state.zones.size < ZONES.length) parts.push(`zone IN (${[...state.zones].map(quote).join(",") || '""'})`);
    return parts.join(" AND ");
  }
  function apiUrl(path, params) {
    const u = new URL(DATASET + path);
    Object.entries(params).forEach(([k, v]) => v !== undefined && v !== "" && u.searchParams.set(k, v));
    return u.toString();
  }
  const filtresVides = () => state.statuts.size === 0 || state.zones.size === 0;

  let statusTimer;
  function showStatus(msg, ms) {
    const el = $("#map-status");
    clearTimeout(statusTimer);
    if (!msg) { el.hidden = true; return; }
    el.textContent = msg;
    el.hidden = false;
    if (ms) statusTimer = setTimeout(() => (el.hidden = true), ms);
  }

  // ---------- Carte ----------
  const map = L.map("map", { preferCanvas: true, zoomControl: false, minZoom: 8, maxZoom: 20 })
    .setView([43.58, 3.45], 9);
  L.control.zoom({ position: "topright" }).addTo(map);
  L.control.scale({ imperial: false, position: "bottomright" }).addTo(map);

  const wmts = (layer, format) =>
    `https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=normal&TILEMATRIXSET=PM&FORMAT=${format}&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}`;
  const ign = '&copy; <a href="https://www.ign.fr/" target="_blank" rel="noopener">IGN</a> – Géoplateforme';
  const fonds = {
    "Plan IGN": L.tileLayer(wmts("GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2", "image/png"), { maxZoom: 20, maxNativeZoom: 19, attribution: ign }),
    "Photographies aériennes": L.tileLayer(wmts("ORTHOIMAGERY.ORTHOPHOTOS", "image/jpeg"), { maxZoom: 20, maxNativeZoom: 19, attribution: ign }),
    "Esri – Plan": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, attribution: "Tiles &copy; Esri" }),
    "Esri – Topographie": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, attribution: "Tiles &copy; Esri" }),
    "Esri – Imagerie satellite": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 19, attribution: "Tiles &copy; Esri – Maxar, Earthstar Geographics" }),
    "Esri – Gris clair": L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}", { maxZoom: 20, maxNativeZoom: 16, attribution: "Tiles &copy; Esri" }),
  };
  fonds["Plan IGN"].addTo(map);
  L.control.layers(fonds, null, { position: "topright" }).addTo(map);
  map.attributionControl.addAttribution('Données fibre : <a href="https://www.herault-data.fr/" target="_blank" rel="noopener">Hérault Data</a>');

  const coucheCommunes = L.layerGroup().addTo(map);
  const coucheContour = L.layerGroup().addTo(map);
  const coucheImmeubles = L.layerGroup().addTo(map);
  const couchePin = L.layerGroup().addTo(map);

  let couleurs = {};
  const lireCouleurs = () => (couleurs = { ok: css("--ok"), dem: css("--dem"), non: css("--non"), ink: css("--ink"), surface: css("--surface"), accent: css("--accent") });
  lireCouleurs();

  // ---------- Communes : bulles de synthèse ----------
  async function chargerCommunes() {
    const communes = await getJSON(`${GEO_API}/departements/34/communes?fields=nom,code,centre&format=json`);
    state.communes = communes.map((c) => ({ nom: c.nom, code: c.code, lat: c.centre.coordinates[1], lon: c.centre.coordinates[0] }));
  }

  async function chargerStatsCommunes() {
    state.stats.clear();
    if (filtresVides()) return;
    const rows = await getJSON(apiUrl("/exports/json", {
      select: "commune,eligibilite,count(*) as n",
      group_by: "commune,eligibilite",
      where: where(),
    }));
    for (const r of rows) {
      if (!r.commune) continue;
      const s = state.stats.get(r.commune) || { total: 0, ok: 0, dem: 0, non: 0 };
      s[statutDe(r.eligibilite).cls] += r.n;
      s.total += r.n;
      state.stats.set(r.commune, s);
    }
    // Communes absentes du référentiel (anciennes communes fusionnées) : on prend la position d'un de leurs immeubles.
    const connues = new Set(state.communes.map((c) => c.nom));
    const manquantes = [...state.stats.keys()].filter((n) => !connues.has(n));
    await Promise.all(manquantes.map(async (nom) => {
      try {
        const r = await getJSON(apiUrl("/records", { select: "geopoint", where: `commune=${quote(nom)}`, limit: 1 }));
        const g = r.results[0]?.geopoint;
        if (g) state.communes.push({ nom, code: null, lat: g.lat, lon: g.lon });
      } catch (_) { /* commune ignorée */ }
    }));
  }

  function couleurPart(s) {
    const p = pct(s.ok + s.dem, s.total);
    return p >= 95 ? couleurs.ok : p >= 80 ? couleurs.dem : couleurs.non;
  }

  function dessinerCommunes() {
    coucheCommunes.clearLayers();
    const max = Math.max(1, ...[...state.stats.values()].map((s) => s.total));
    for (const c of state.communes) {
      const s = state.stats.get(c.nom);
      if (!s || !s.total) continue;
      const r = 5 + 26 * Math.sqrt(s.total / max);
      const m = L.circleMarker([c.lat, c.lon], {
        radius: r, color: couleurs.surface, weight: 1.5, fillColor: couleurPart(s), fillOpacity: 0.78,
      });
      m.bindTooltip(
        `<div class="commune-tip"><strong>${esc(c.nom)}</strong><br>${fmt.format(s.total)} immeubles · ${fmtPct(pct(s.ok + s.dem, s.total))} éligibles</div>`,
        { direction: "top", offset: [0, -r], opacity: 1 }
      );
      m.on("click", () => selectionnerCommune(c));
      coucheCommunes.addLayer(m);
    }
  }

  // ---------- Statistiques du panneau ----------
  async function majStats() {
    const scope = state.commune;
    $("#stats-scope").textContent = scope ? "Commune" : "Département";
    $("#stats-title").textContent = scope ? scope.nom : "Hérault (34)";
    $("#clear-commune").hidden = !scope;

    let parStatut = { ok: 0, dem: 0, non: 0 };
    let total = 0;
    if (!filtresVides()) {
      const extra = scope ? [`commune=${quote(scope.nom)}`] : [];
      const res = await getJSON(apiUrl("/records", { select: "eligibilite,count(*) as n", group_by: "eligibilite", where: where(extra), limit: 10 }));
      for (const r of res.results) { parStatut[statutDe(r.eligibilite).cls] += r.n; total += r.n; }
    }
    $("#stat-total").textContent = fmt.format(total);
    $("#stat-bar").innerHTML = STATUTS.map((s) => `<span class="c-${s.cls}" style="flex-grow:${parStatut[s.cls]}" title="${esc(s.label)}"></span>`).join("");
    $("#stat-rows").innerHTML = STATUTS.map((s) => `
      <li><span class="dot c-${s.cls}"></span><span>${esc(s.label)}</span>
        <span class="n">${fmt.format(parStatut[s.cls])}</span><span class="p">${fmtPct(pct(parStatut[s.cls], total))}</span></li>`).join("");
    $("#stat-bar").setAttribute("aria-label", STATUTS.map((s) => `${s.label} : ${fmtPct(pct(parStatut[s.cls], total))}`).join(", "));

    // Compteurs à côté des filtres (pour l'emprise : département ou commune, sans tenir compte du filtre lui-même).
    const extra = scope ? [`commune=${quote(scope.nom)}`] : [];
    const [rz, rs] = await Promise.all([
      getJSON(apiUrl("/records", { select: "zone,count(*) as n", group_by: "zone", where: extra.join(" AND "), limit: 10 })),
      getJSON(apiUrl("/records", { select: "eligibilite,count(*) as n", group_by: "eligibilite", where: extra.join(" AND "), limit: 10 })),
    ]);
    document.querySelectorAll("#filter-zones .count").forEach((el) => {
      const r = rz.results.find((x) => x.zone === el.dataset.key);
      el.textContent = fmt.format(r ? r.n : 0);
    });
    document.querySelectorAll("#filter-statuts .count").forEach((el) => {
      const r = rs.results.find((x) => x.eligibilite === el.dataset.key);
      el.textContent = fmt.format(r ? r.n : 0);
    });
  }

  // ---------- Immeubles ----------
  function popupImmeuble(p) {
    const st = statutDe(p.eligibilite);
    const z = zoneDe(p.zone);
    const logo = p.logo ? ASSETS + encodeURI(p.logo) : z ? ASSETS + encodeURI(z.logo) : "";
    const lienOp = p.hyperlienoperateurs && /^https?:\/\//.test(p.hyperlienoperateurs) ? p.hyperlienoperateurs : null;
    const commentaire = p.commentaire || (st.cls === "dem"
      ? "Ce logement peut être raccordé après des travaux complémentaires. Souscrivez auprès d'un opérateur : le raccordement est réalisé dans un délai de 6 mois."
      : "");
    return `
      <div class="pop">
        <div class="pop-head">
          ${logo ? `<img src="${esc(logo)}" alt="${esc(z ? z.label : "Opérateur")}">` : ""}
          <div><span class="pill ${st.cls}">${esc(st.label)}</span>
          <p class="pop-addr">${esc(p.adresse_complete || "Adresse inconnue")}</p></div>
        </div>
        <div class="pop-body">
          ${commentaire ? `<p>${esc(commentaire)}</p>` : ""}
          <dl>
            <dt>Commune</dt><dd>${esc(p.commune || "–")}</dd>
            <dt>Déploiement</dt><dd>${esc(z ? z.label : p.zone || "–")}</dd>
            <dt>Immeuble</dt><dd class="mono">${esc(p.identifiant_immeuble || "–")}</dd>
            <dt>Point de mutualisation</dt><dd class="mono">${esc(p.reference_pm || "–")}</dd>
            <dt>Mise à jour</dt><dd>${esc(p.date_de_mise_a_jour || "–")}</dd>
          </dl>
          ${lienOp ? `<a class="pop-cta" href="${esc(lienOp)}" target="_blank" rel="noopener">Voir les opérateurs disponibles</a>` : ""}
          ${st.cls === "non" ? `<p class="pop-note">Les opérateurs commerciaux ne sont pas encore proposés à cette adresse.</p>` : ""}
        </div>
      </div>`;
  }

  function rayonPoint() {
    const z = map.getZoom();
    return z >= 18 ? 7 : z >= 16 ? 5.5 : 4.5;
  }

  let immeubles = null;       // couche GeoJSON courante
  let controleur = null;      // AbortController de la requête en cours
  let modeImmeubles = "aucun"; // "aucun" | "emprise" | "commune"
  let empriseChargee = null;  // emprise déjà chargée (pour ne pas recharger à chaque petit déplacement)
  let empriseComplete = false; // vrai si tous les immeubles de cette emprise ont été chargés

  function afficherImmeubles(geojson) {
    // Si une fenêtre d'information est ouverte, on la rouvre après le rechargement.
    let ouvert = null;
    if (immeubles) immeubles.eachLayer((l) => { if (l.isPopupOpen()) ouvert = l.feature.properties.identifiant_immeuble; });
    coucheImmeubles.clearLayers();
    immeubles = L.geoJSON(geojson, {
      pointToLayer: (f, latlng) => L.circleMarker(latlng, {
        radius: rayonPoint(), color: couleurs.surface, weight: 1, fillColor: couleurs[statutDe(f.properties.eligibilite).cls], fillOpacity: 0.92,
      }),
      onEachFeature: (f, layer) => layer.bindPopup(() => popupImmeuble(f.properties), { maxWidth: 320, autoPanPadding: [20, 20] }),
    });
    coucheImmeubles.addLayer(immeubles);
    if (ouvert) immeubles.eachLayer((l) => { if (l.feature.properties.identifiant_immeuble === ouvert) l.openPopup(); });
  }

  async function chargerImmeubles() {
    if (controleur) controleur.abort();
    controleur = new AbortController();
    const signal = controleur.signal;

    const commune = state.commune && state.commune.total <= LIMITE_COMMUNE ? state.commune : null;
    const parZoom = map.getZoom() >= ZOOM_IMMEUBLES;

    if (filtresVides()) { modeImmeubles = "aucun"; coucheImmeubles.clearLayers(); majVisibilite(); showStatus("Aucun filtre sélectionné.", 3000); return; }
    if (!commune && !parZoom) { modeImmeubles = "aucun"; coucheImmeubles.clearLayers(); immeubles = null; majVisibilite(); showStatus(""); return; }

    let conditions;
    if (commune && (!parZoom || modeImmeubles === "commune")) {
      if (modeImmeubles === "commune" && immeubles && immeubles._commune === commune.nom) { majVisibilite(); return; }
      conditions = [`commune=${quote(commune.nom)}`];
      modeImmeubles = "commune";
    } else {
      if (modeImmeubles === "emprise" && immeubles && empriseComplete && empriseChargee && empriseChargee.contains(map.getBounds())) return;
      const b = map.getBounds().pad(0.25);
      empriseChargee = b;
      conditions = [`in_bbox(geopoint, ${b.getSouth().toFixed(6)}, ${b.getWest().toFixed(6)}, ${b.getNorth().toFixed(6)}, ${b.getEast().toFixed(6)})`];
      modeImmeubles = "emprise";
    }

    showStatus("Chargement des immeubles…");
    try {
      const w = where(conditions);
      const [geo, compte] = await Promise.all([
        getJSON(apiUrl("/exports/geojson", { where: w, limit: LIMITE_EMPRISE, select: "identifiant_immeuble,eligibilite,commentaire,adresse_complete,commune,zone,date_de_mise_a_jour,reference_pm,logo,hyperlienoperateurs,geopoint" }), signal),
        getJSON(apiUrl("/records", { where: w, limit: 0 }), signal),
      ]);
      afficherImmeubles(geo);
      immeubles._commune = modeImmeubles === "commune" ? commune.nom : null;
      majVisibilite();
      const n = compte.total_count;
      empriseComplete = n <= LIMITE_EMPRISE;
      if (n > LIMITE_EMPRISE) showStatus(`${fmt.format(LIMITE_EMPRISE)} immeubles affichés sur ${fmt.format(n)} : zoomez pour tout voir.`);
      else if (n === 0) showStatus("Aucun immeuble dans cette zone pour les filtres choisis.", 3500);
      else showStatus(`${fmt.format(n)} immeuble${n > 1 ? "s" : ""} affiché${n > 1 ? "s" : ""}.`, 2500);
      ouvrirPopupEnAttente();
    } catch (e) {
      if (e.name === "AbortError") return;
      console.error(e);
      showStatus("Les immeubles n'ont pas pu être chargés. Vérifiez votre connexion puis déplacez la carte pour réessayer.");
    }
  }

  // Les bulles des communes s'effacent dès que les immeubles sont affichés.
  function majVisibilite() {
    const montrerBulles = modeImmeubles === "aucun";
    if (montrerBulles && !map.hasLayer(coucheCommunes)) map.addLayer(coucheCommunes);
    if (!montrerBulles && map.hasLayer(coucheCommunes)) map.removeLayer(coucheCommunes);
  }

  // ---------- Sélection d'une commune ----------
  async function selectionnerCommune(c) {
    const s = state.stats.get(c.nom);
    state.commune = { nom: c.nom, code: c.code, total: s ? s.total : 0 };
    coucheContour.clearLayers();
    let bounds = null;
    if (c.code) {
      try {
        const g = await getJSON(`${GEO_API}/communes/${c.code}?fields=contour&format=geojson&geometry=contour`);
        const contour = L.geoJSON(g, { interactive: false, style: { color: couleurs.accent, weight: 2.5, fill: true, fillOpacity: 0.04, dashArray: "6 4" } });
        coucheContour.addLayer(contour);
        bounds = contour.getBounds();
      } catch (_) { /* pas de contour */ }
    }
    modeImmeubles = "aucun";
    immeubles = null;
    if (bounds) map.fitBounds(bounds, { padding: [30, 30], maxZoom: 16 });
    else map.setView([c.lat, c.lon], 14);
    majStats().catch(console.error);
    chargerImmeubles();
  }

  function deselectionnerCommune() {
    state.commune = null;
    coucheContour.clearLayers();
    modeImmeubles = "aucun";
    coucheImmeubles.clearLayers();
    immeubles = null;
    map.flyTo([43.58, 3.45], 9, { duration: 0.8 });
    majStats().catch(console.error);
  }
  $("#clear-commune").addEventListener("click", deselectionnerCommune);

  // ---------- Filtres ----------
  function construireFiltres() {
    $("#filter-statuts").innerHTML = STATUTS.map((s, i) => `
      <label class="check" for="st-${i}"><input type="checkbox" id="st-${i}" data-type="statut" value="${esc(s.key)}" checked>
        <span class="lbl"><span class="dot c-${s.cls}"></span>${esc(s.label)}</span><span class="count" data-key="${esc(s.key)}">–</span></label>`).join("");
    $("#filter-zones").innerHTML = ZONES.map((z, i) => `
      <label class="check" for="zo-${i}"><input type="checkbox" id="zo-${i}" data-type="zone" value="${esc(z.key)}" checked>
        <span class="lbl"><img src="${esc(ASSETS + encodeURI(z.logo))}" alt="" loading="lazy">${esc(z.label)}</span><span class="count" data-key="${esc(z.key)}">–</span></label>`).join("");
    document.querySelectorAll(".checks input").forEach((el) => el.addEventListener("change", onFiltre));
  }
  async function onFiltre(e) {
    const set = e.target.dataset.type === "statut" ? state.statuts : state.zones;
    e.target.checked ? set.add(e.target.value) : set.delete(e.target.value);
    modeImmeubles = "aucun";
    immeubles = null;
    majStats().catch(console.error);
    chargerImmeubles();
    try { await chargerStatsCommunes(); dessinerCommunes(); } catch (err) { console.error(err); }
    if (state.commune) state.commune.total = state.stats.get(state.commune.nom)?.total || 0;
  }

  // ---------- Recherche d'adresse ----------
  let popupEnAttente = null;
  function ouvrirPopupEnAttente() {
    if (!popupEnAttente || !immeubles) return;
    const cible = popupEnAttente;
    let best = null, bestD = Infinity;
    immeubles.eachLayer((l) => { const d = l.getLatLng().distanceTo(cible); if (d < bestD) { bestD = d; best = l; } });
    popupEnAttente = null;
    if (best && bestD < 40) best.openPopup();
  }

  const input = $("#search-input");
  const liste = $("#search-results");
  let resultats = [], actif = -1, minuteur, ctrlRecherche;

  function fermerListe() { liste.hidden = true; input.setAttribute("aria-expanded", "false"); actif = -1; }
  function rendreListe() {
    if (!resultats.length) { liste.innerHTML = `<li class="empty">Aucune adresse trouvée dans l'Hérault.</li>`; }
    else liste.innerHTML = resultats.map((f, i) => `
      <li role="option" id="opt-${i}" aria-selected="${i === actif}" data-i="${i}">
        <span>${esc(f.properties.name)}</span><small>${esc(f.properties.postcode)} ${esc(f.properties.city)}</small></li>`).join("");
    liste.hidden = false;
    input.setAttribute("aria-expanded", "true");
  }
  async function rechercher(q) {
    if (ctrlRecherche) ctrlRecherche.abort();
    ctrlRecherche = new AbortController();
    try {
      const u = new URL(GEOCODER);
      u.search = new URLSearchParams({ q, limit: 10, autocomplete: 1, lat: 43.6, lon: 3.5, index: "address" });
      const data = await getJSON(u, ctrlRecherche.signal);
      resultats = data.features.filter((f) => f.properties.depcode === "34" || String(f.properties.citycode).startsWith("34")).slice(0, 6);
      actif = -1;
      rendreListe();
    } catch (e) { if (e.name !== "AbortError") console.error(e); }
  }
  function choisir(f) {
    const [lon, lat] = f.geometry.coordinates;
    input.value = f.properties.label;
    fermerListe();
    couchePin.clearLayers();
    L.marker([lat, lon], { icon: L.divIcon({ className: "", html: '<div class="pin"></div>', iconSize: [18, 18] }), keyboard: false, interactive: false }).addTo(couchePin);
    popupEnAttente = L.latLng(lat, lon);
    map.setView([lat, lon], 18);
  }
  input.addEventListener("input", () => {
    clearTimeout(minuteur);
    const q = input.value.trim();
    if (q.length < 3) { fermerListe(); return; }
    minuteur = setTimeout(() => rechercher(q), 250);
  });
  input.addEventListener("keydown", (e) => {
    if (liste.hidden || !resultats.length) return;
    if (e.key === "ArrowDown") { actif = (actif + 1) % resultats.length; rendreListe(); e.preventDefault(); }
    else if (e.key === "ArrowUp") { actif = (actif - 1 + resultats.length) % resultats.length; rendreListe(); e.preventDefault(); }
    else if (e.key === "Enter") { choisir(resultats[Math.max(actif, 0)]); e.preventDefault(); }
    else if (e.key === "Escape") fermerListe();
  });
  liste.addEventListener("mousedown", (e) => {
    const li = e.target.closest("li[data-i]");
    if (li) { e.preventDefault(); choisir(resultats[+li.dataset.i]); }
  });
  input.addEventListener("blur", () => setTimeout(fermerListe, 150));

  // ---------- Événements carte ----------
  let deplacement;
  map.on("moveend", () => { clearTimeout(deplacement); deplacement = setTimeout(chargerImmeubles, 200); });
  map.on("zoomend", () => {
    if (!immeubles) return;
    const r = rayonPoint();
    immeubles.eachLayer((l) => l.setRadius(r));
  });

  // Thème clair/sombre : on relit les couleurs et on redessine.
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  const surTheme = () => {
    lireCouleurs();
    dessinerCommunes();
    if (immeubles) immeubles.eachLayer((l) => l.setStyle({ color: couleurs.surface, fillColor: couleurs[statutDe(l.feature.properties.eligibilite).cls] }));
  };
  mq.addEventListener ? mq.addEventListener("change", surTheme) : mq.addListener(surTheme);

  // ---------- Démarrage ----------
  async function demarrer() {
    construireFiltres();
    showStatus("Chargement des données…");
    try {
      const meta = await getJSON(DATASET);
      const d = meta?.metas?.default?.data_processed || meta?.metas?.default?.modified;
      if (d) $("#maj").textContent = new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
    } catch (_) { /* date non disponible */ }
    try {
      await chargerCommunes();
      await Promise.all([chargerStatsCommunes(), majStats()]);
      dessinerCommunes();
      showStatus("");
    } catch (e) {
      console.error(e);
      showStatus("Les données n'ont pas pu être chargées. Rechargez la page pour réessayer.");
    }
  }
  demarrer();
})();
