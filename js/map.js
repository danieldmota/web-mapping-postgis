const API_URL = "http://localhost:3000";

const map = L.map("map").setView([-20.4697, -54.6201], 13);
let pontoEmEdicao = null;
let criarNovoPontoNoMapa = false;
let marcadorTemp = null;
let modoDesenho = null;
let pontoDesenho = [];
let colecaoPontos = [];
let linhas = {};
let poligonos = {};
let linhasDesenhadas = {};
let poligonosDesenhados = {};
let camadaGeoJSON;
let linhaEmEdicao = null;
let poligonoEmEdicao = null;
let linhaEmEdicaoId = null;
let poligonoEmEdicaoId = null;
let marcadoresVertices = [];

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

function ativarModoDesenhoPonto() {
  modoDesenho = "ponto";
  criarNovoPontoNoMapa = true;
  pontoDesenho = [];
  atualizarBotoesDesenho();
  mostrarMensagem("Clique no mapa para criar um ponto");
}

function ativarModoDesenhoLinhaOuPoligono(modo) {
  modoDesenho = modo;
  criarNovoPontoNoMapa = false;
  pontoDesenho = [];
  atualizarBotoesDesenho();
  mostrarMensagem("Clique múltiplas vezes para desenhar");
}

function ativarModoDesenhoLinha() {
  ativarModoDesenhoLinhaOuPoligono("linha");
}

function ativarModoDesenhoPoligono() {
  ativarModoDesenhoLinhaOuPoligono("poligono");
}

function limparMarcadoresVertices() {
  marcadoresVertices.forEach((m) => map.removeLayer(m));
  marcadoresVertices = [];
}

function cancelarModoDesenho() {
  modoDesenho = null;
  criarNovoPontoNoMapa = false;
  pontoDesenho = [];
  limparMarcadoresVertices();
  Object.values(linhasDesenhadas).forEach((l) => map.removeLayer(l));
  Object.values(poligonosDesenhados).forEach((p) => map.removeLayer(p));
  linhasDesenhadas = {};
  poligonosDesenhados = {};
  atualizarBotoesDesenho();
}

function desenharVerticesArrastaveis() {
  limparMarcadoresVertices();
  if (!pontoDesenho || pontoDesenho.length === 0) return;
  const isLinha = modoDesenho === "linha";
  const coordFormId = isLinha ? "linhaCoordenadas" : "poligonoCoordenadas";
  const icon = L.divIcon({
    className: "vertex-marker",
    html: "<div></div>",
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
  pontoDesenho.forEach((p, i) => {
    const marker = L.marker([p[1], p[0]], { draggable: true, icon }).addTo(map);
    marker._vertexIndex = i;
    marker.on("click", (e) => L.DomEvent.stopPropagation(e));
    marker.on("dragend", () => {
      const ll = marker.getLatLng();
      pontoDesenho[i] = [ll.lng, ll.lat];
      if (isLinha) {
        atualizarTempLinhaNoMapa();
      } else {
        atualizarTempPoligonoNoMapa();
      }
      atualizarCoordenadasForm(coordFormId);
    });
    marcadoresVertices.push(marker);
  });
}

function atualizarBotoesDesenho() {
  document
    .getElementById("btnDesenhoPonto")
    .classList.toggle("is-active", modoDesenho === "ponto");
  document
    .getElementById("btnDesenhoLinha")
    .classList.toggle("is-active", modoDesenho === "linha");
  document
    .getElementById("btnDesenhoPoligono")
    .classList.toggle("is-active", modoDesenho === "poligono");
  document
    .getElementById("btnCancelarDesenho")
    .classList.toggle("hidden", !modoDesenho);
}

function atualizarCoordenadasForm(elementId) {
  const el = document.getElementById(elementId);
  if (!el) return;

  if (!pontoDesenho || pontoDesenho.length === 0) {
    el.value = "";
    return;
  }

  el.value = pontoDesenho
    .map(([lng, lat], idx) => `${idx + 1}: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
    .join("\n");
}

function atualizarTempLinhaNoMapa() {
  if (linhasDesenhadas["temp-linha"]) {
    map.removeLayer(linhasDesenhadas["temp-linha"]);
  }
  if (pontoDesenho && pontoDesenho.length >= 1) {
    linhasDesenhadas["temp-linha"] = L.polyline(
      pontoDesenho.map((p) => [p[1], p[0]]),
      { color: "#ff6b6b", weight: 2, opacity: 0.5 },
    ).addTo(map);
  }
}

function atualizarTempPoligonoNoMapa() {
  if (poligonosDesenhados["temp-poly"]) {
    map.removeLayer(poligonosDesenhados["temp-poly"]);
  }
  if (pontoDesenho && pontoDesenho.length >= 3) {
    poligonosDesenhados["temp-poly"] = L.polygon(
      pontoDesenho.map((p) => [p[1], p[0]]),
      { color: "#4ecdc4", weight: 2, opacity: 0.5, fillOpacity: 0.2 },
    ).addTo(map);
  }
}

function aplicarCliquePonto(p) {
  document.getElementById("lat").value = p.latlng.lat.toFixed(4);
  document.getElementById("lng").value = p.latlng.lng.toFixed(4);
  const elPonto = document.getElementById("pontoCoordenadas");
  if (elPonto) elPonto.value = `1: ${p.latlng.lat.toFixed(4)}, ${p.latlng.lng.toFixed(4)}`;
  if (marcadorTemp) map.removeLayer(marcadorTemp);
  marcadorTemp = L.circleMarker([p.latlng.lat, p.latlng.lng], {
    radius: 8,
    fillColor: "#007bff",
    color: "#0056b3",
    weight: 2,
    opacity: 1,
    fillOpacity: 0.8,
  }).addTo(map);
  mostrarMensagem(
    "Coordenadas definidas! Clique em 'Salvar' para criar o ponto.",
  );
}

map.on("click", (p) => {
  if (modoDesenho === "ponto" || criarNovoPontoNoMapa) {
    aplicarCliquePonto(p);
  } else if (modoDesenho === "linha") {
    pontoDesenho.push([p.latlng.lng, p.latlng.lat]);
    desenharVerticesArrastaveis();
    atualizarTempLinhaNoMapa();
    atualizarCoordenadasForm("linhaCoordenadas");
    mostrarMensagem(
      `Ponto ${pontoDesenho.length} adicionado. Arraste os vértices para ajustar.`,
    );
  } else if (modoDesenho === "poligono") {
    pontoDesenho.push([p.latlng.lng, p.latlng.lat]);
    desenharVerticesArrastaveis();
    atualizarTempPoligonoNoMapa();
    atualizarCoordenadasForm("poligonoCoordenadas");
    mostrarMensagem(
      `Ponto ${pontoDesenho.length} adicionado. Arraste os vértices para ajustar.`,
    );
  }
});

async function carregarLinhas() {
  try {
    const res = await fetch(`${API_URL}/linhas`);
    const data = await res.json();

    Object.values(linhas).forEach((item) => {
      if (item.layer) {
        map.removeLayer(item.layer);
      }
    });
    linhas = {};

    data.forEach((linha) => {
      let geometry = linha.geometry;
      if (typeof geometry === "string") {
        try {
          geometry = JSON.parse(geometry);
        } catch (e) {
          console.error("GeoJSON de linha inválido:", e);
          return;
        }
      }

      if (!geometry || geometry.type !== "LineString") return;

      const latlngs = geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const layer = L.polyline(latlngs, {
        color: "#ff6b6b",
        weight: 3,
      }).addTo(map);

      layer.bindPopup(
        `<b>${linha.nome}</b><br>${linha.descricao || "Sem descrição"}`,
      );

      layer.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        mostrarFormularioEditarLinha(linha);
      });

      linhas[linha.id] = { data: linha, layer };
    });
  } catch (error) {
    console.error("Erro ao carregar linhas:", error);
  }
}

async function carregarPoligonos() {
  try {
    const res = await fetch(`${API_URL}/poligonos`);
    const data = await res.json();

    Object.values(poligonos).forEach((item) => {
      if (item.layer) {
        map.removeLayer(item.layer);
      }
    });
    poligonos = {};

    data.forEach((poligono) => {
      let geometry = poligono.geometry;
      if (typeof geometry === "string") {
        try {
          geometry = JSON.parse(geometry);
        } catch (e) {
          console.error("GeoJSON de polígono inválido:", e);
          return;
        }
      }

      if (!geometry || geometry.type !== "Polygon") return;

      const latlngs = geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
      const layer = L.polygon(latlngs, {
        color: "#4ecdc4",
        weight: 2,
        fillOpacity: 0.2,
      }).addTo(map);

      layer.bindPopup(
        `<b>${poligono.nome}</b><br>${
          poligono.descricao || "Sem descrição"
        }`,
      );

      layer.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        mostrarFormularioEditarPoligono(poligono);
      });

      poligonos[poligono.id] = { data: poligono, layer };
    });
  } catch (error) {
    console.error("Erro ao carregar poligonos:", error);
  }
}

