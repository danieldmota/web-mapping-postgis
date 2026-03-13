const map = L.map("map").setView([-20.4697, -54.6201], 13);
let marcadores = {};
let eventoEmEdicao = null;
let criarNovoEventoNoMapa = false;
let marcadorTemp = null;
let modoDesenho = null;
let pontoDesenho = [];
let linhas = {};
let poligonos = {};
let linhasDesenhadas = {};
let poligonosDesenhados = {};

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

function mostrarMensagem(msg) {
  const el = document.getElementById("successMsg");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

function mostrarFormularioCriar() {
  document.getElementById("formCriar").classList.remove("hidden");
  document.getElementById("formEditar").classList.add("hidden");
  document.getElementById("formImportar").classList.add("hidden");
  document.getElementById("nome").focus();
  criarNovoEventoNoMapa = true;
}

function mostrarFormularioImportar() {
  document.getElementById("formImportar").classList.remove("hidden");
  document.getElementById("formCriar").classList.add("hidden");
  document.getElementById("formEditar").classList.add("hidden");
}

function cancelarFormulario() {
  document.getElementById("formCriar").classList.add("hidden");
  document.getElementById("formEditar").classList.add("hidden");
  document.getElementById("formImportar").classList.add("hidden");
  criarNovoEventoNoMapa = false;
  eventoEmEdicao = null;
  document.getElementById("fileImport").value = "";
  if (marcadorTemp) {
    map.removeLayer(marcadorTemp);
    marcadorTemp = null;
  }
}

function ativarModoDesenhoPonto() {
  modoDesenho = "ponto";
  criarNovoEventoNoMapa = true;
  pontoDesenho = [];
  atualizarBotoesDesenho();
  mostrarMensagem("📍 Modo ponto ativado - Clique no mapa para criar um ponto");
}

function ativarModoDesenhoLinha() {
  modoDesenho = "linha";
  criarNovoEventoNoMapa = false;
  pontoDesenho = [];
  atualizarBotoesDesenho();
  mostrarMensagem(
    "📏 Modo linha ativado - Clique múltiplas vezes para desenhar. Duplo clique para finalizar",
  );
}

function ativarModoDesenhoPoligono() {
  modoDesenho = "poligono";
  criarNovoEventoNoMapa = false;
  pontoDesenho = [];
  atualizarBotoesDesenho();
  mostrarMensagem(
    "Modo polígono ativado - Clique múltiplas vezes para desenhar. Duplo clique para finalizar",
  );
}

function cancelarModoDesenho() {
  modoDesenho = null;
  criarNovoEventoNoMapa = false;
  pontoDesenho = [];
  Object.values(linhasDesenhadas).forEach((l) => map.removeLayer(l));
  Object.values(poligonosDesenhados).forEach((p) => map.removeLayer(p));
  linhasDesenhadas = {};
  poligonosDesenhados = {};
  atualizarBotoesDesenho();
  mostrarMensagem("Modo de desenho cancelado");
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

async function carregarEventos() {
  try {
    const res = await fetch("http://localhost:3000/eventos");
    const eventos = await res.json();

    // Limpar marcadores antigos
    Object.values(marcadores).forEach((m) => m.remove());
    marcadores = {};

    eventos.forEach((e) => {
      adicionarMarcador(e);
    });

    atualizarLista(eventos);
  } catch (error) {
    console.error("Erro ao carregar eventos:", error);
  }
}

async function carregarLinhas() {
  try {
    const res = await fetch("http://localhost:3000/linhas");
    const linhasList = await res.json();

    Object.values(linhasDesenhadas).forEach((l) => l.remove());
    linhasDesenhadas = {};
    linhas = {};

    linhasList.forEach((linha) => {
      const geo = JSON.parse(linha.geometry);
      const coords = geo.coordinates;
      const polyline = L.polyline(
        coords.map((c) => [c[1], c[0]]),
        {
          color: "#ff6b6b",
          weight: 3,
          opacity: 0.7,
        },
      ).addTo(map);

      polyline.bindPopup(`<b>${linha.nome}</b><br>${linha.descricao || ""}`);
      linhasDesenhadas[linha.id] = polyline;
      linhas[linha.id] = linha;
    });
  } catch (error) {
    console.error("Erro ao carregar linhas:", error);
  }
}

async function carregarPoligonos() {
  try {
    const res = await fetch("http://localhost:3000/poligonos");
    const poligonosList = await res.json();

    Object.values(poligonosDesenhados).forEach((p) => p.remove());
    poligonosDesenhados = {};
    poligonos = {};

    poligonosList.forEach((poligono) => {
      const geo = JSON.parse(poligono.geometry);
      const coords = geo.coordinates[0];
      const polygon = L.polygon(
        coords.map((c) => [c[1], c[0]]),
        {
          color: "#4ecdc4",
          weight: 2,
          opacity: 0.7,
          fillOpacity: 0.3,
        },
      ).addTo(map);

      polygon.bindPopup(
        `<b>${poligono.nome}</b><br>${poligono.descricao || ""}`,
      );
      poligonosDesenhados[poligono.id] = polygon;
      poligonos[poligono.id] = poligono;
    });
  } catch (error) {
    console.error("Erro ao carregar polígonos:", error);
  }
}

function adicionarMarcador(evento) {
  const geo = JSON.parse(evento.geometry);
  const coords = geo.coordinates;

  const marker = L.marker([coords[1], coords[0]], { draggable: true })
    .addTo(map)
    .bindPopup(
      `<b>${evento.nome}</b><br>${evento.descricao}<br><i>${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}</i>`,
    );

  marker.evento = evento;
  marker.on("click", () => {
    eventoEmEdicao = evento;
    mostrarFormularioEditar(evento);
  });

  marker.on("dragend", async () => {
    const novasCoords = marker.getLatLng();
    try {
      const res = await fetch(
        `http://localhost:3000/eventos/${evento.id}/coordenadas`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: novasCoords.lat,
            lng: novasCoords.lng,
          }),
        },
      );
      if (res.ok) {
        const atualizado = await res.json();
        marker.evento = atualizado;
        mostrarMensagem("📍 Coordenadas atualizadas!");
      }
    } catch (error) {
      console.error("Erro ao atualizar coordenadas:", error);
    }
  });

  marcadores[evento.id] = marker;
}

function atualizarLista(eventos) {
  const lista = document.getElementById("eventosList");
  lista.innerHTML = "";

  if (eventos.length === 0) {
    lista.innerHTML =
      "<p style='color: #aaa; text-align: center; padding: 20px;'>Nenhum evento</p>";
    return;
  }

  eventos.forEach((e) => {
    const geo = JSON.parse(e.geometry);
    const coords = geo.coordinates;
    const item = document.createElement("div");
    item.className = "evento-item";
    item.innerHTML = `
      <h4>${e.nome}</h4>
      <p>${e.descricao || "Sem descrição"}</p>
      <p style='font-size: 11px;'> ${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}</p>
      <div class="evento-actions">
        <button class="edit" onclick="editarEvento(${e.id})">Editar</button>
        <button class="delete" onclick="deletarEvento(${e.id})">Deletar</button>
      </div>
    `;
    lista.appendChild(item);
  });
}

function mostrarFormularioEditar(evento) {
  document.getElementById("editNome").value = evento.nome;
  document.getElementById("editDescricao").value = evento.descricao || "";
  document.getElementById("editTipo").value = evento.tipo || "geral";
  document.getElementById("formEditar").classList.remove("hidden");
  document.getElementById("formCriar").classList.add("hidden");
  document.getElementById("formImportar").classList.add("hidden");
}

function editarEvento(id) {
  const evento = Object.values(marcadores).find(
    (m) => m.evento.id === id,
  )?.evento;
  if (evento) {
    eventoEmEdicao = evento;
    mostrarFormularioEditar(evento);
  }
}

async function atualizarEvento() {
  if (!eventoEmEdicao) return;

  const nome = document.getElementById("editNome").value;
  const descricao = document.getElementById("editDescricao").value;
  const tipo = document.getElementById("editTipo").value;

  if (!nome.trim()) {
    alert("Nome é obrigatório");
    return;
  }

  try {
    const geo = JSON.parse(eventoEmEdicao.geometry);
    const coords = geo.coordinates;

    const res = await fetch(
      `http://localhost:3000/eventos/${eventoEmEdicao.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          descricao,
          tipo,
          lat: coords[1],
          lng: coords[0],
        }),
      },
    );

    if (res.ok) {
      mostrarMensagem("Evento atualizado com sucesso!");
      cancelarFormulario();
      carregarEventos();
    }
  } catch (error) {
    console.error("Erro ao atualizar evento:", error);
    alert("Erro ao atualizar evento");
  }
}

async function deletarEvento(id) {
  if (!confirm("Tem certeza que deseja deletar este evento?")) return;

  try {
    const res = await fetch(`http://localhost:3000/eventos/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      mostrarMensagem("Evento deletado com sucesso!");
      carregarEventos();
    }
  } catch (error) {
    console.error("Erro ao deletar evento:", error);
    alert("Erro ao deletar evento");
  }
}

async function salvarEvento() {
  const nome = document.getElementById("nome").value;
  const descricao = document.getElementById("descricao").value;
  const tipo = document.getElementById("tipo").value;
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);

  if (!nome.trim() || !lat || !lng) {
    alert("Preencha todos os campos obrigatórios");
    return;
  }

  try {
    const res = await fetch("http://localhost:3000/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, descricao, tipo, lat, lng }),
    });

    if (res.ok) {
      mostrarMensagem("Evento criado com sucesso!");
      if (marcadorTemp) {
        map.removeLayer(marcadorTemp);
        marcadorTemp = null;
      }
      cancelarFormulario();
      document.getElementById("nome").value = "";
      document.getElementById("descricao").value = "";
      document.getElementById("lat").value = "";
      document.getElementById("lng").value = "";
      carregarEventos();
    }
  } catch (error) {
    console.error("Erro ao criar evento:", error);
    alert("Erro ao criar evento");
  }
}

async function importarArquivo(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    // Verificar se é um GeoJSON
    let features = [];
    if (data.type === "FeatureCollection" && data.features) {
      features = data.features;
    } else if (Array.isArray(data)) {
      // Se for um array direto de eventos
      features = data.map((e) => ({
        properties: e,
        geometry: {
          type: "Point",
          coordinates: [e.lng || e.longitude, e.lat || e.latitude],
        },
      }));
    }

    if (features.length === 0) {
      alert("Nenhum evento encontrado no arquivo");
      return;
    }

    const res = await fetch("http://localhost:3000/eventos/import/geojson", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features }),
    });

    const result = await res.json();
    mostrarMensagem(`${result.imported} eventos importados com sucesso!`);
    cancelarFormulario();
    carregarEventos();
  } catch (error) {
    console.error("Erro ao importar arquivo:", error);
    alert("Erro ao processar arquivo. Verifique o formato JSON/GeoJSON");
  }
}

map.on("click", (e) => {
  if (modoDesenho === "ponto") {
    document.getElementById("lat").value = e.latlng.lat.toFixed(4);
    document.getElementById("lng").value = e.latlng.lng.toFixed(4);

    if (marcadorTemp) {
      map.removeLayer(marcadorTemp);
    }

    marcadorTemp = L.circleMarker([e.latlng.lat, e.latlng.lng], {
      radius: 8,
      fillColor: "#007bff",
      color: "#0056b3",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    }).addTo(map);

    mostrarMensagem(
      "📍 Coordenadas definidas! Clique em 'Salvar' para criar o evento.",
    );
  } else if (modoDesenho === "linha") {
    pontoDesenho.push([e.latlng.lng, e.latlng.lat]);
    L.circleMarker([e.latlng.lat, e.latlng.lng], {
      radius: 4,
      fillColor: "#ff6b6b",
      color: "#c92a2a",
      weight: 1,
    }).addTo(map);
    linhasDesenhadas["temp-linha"] = L.polyline(
      pontoDesenho.map((p) => [p[1], p[0]]),
      { color: "#ff6b6b", weight: 2, opacity: 0.5 },
    ).addTo(map);
    mostrarMensagem(
      `📏 Ponto ${pontoDesenho.length} adicionado. Clique múltiplas vezes ou duplo-clique para finalizar.`,
    );
  } else if (modoDesenho === "poligono") {
    pontoDesenho.push([e.latlng.lng, e.latlng.lat]);
    L.circleMarker([e.latlng.lat, e.latlng.lng], {
      radius: 4,
      fillColor: "#4ecdc4",
      color: "#0a9396",
      weight: 1,
    }).addTo(map);
    poligonosDesenhados["temp-poly"] = L.polygon(
      pontoDesenho.map((p) => [p[1], p[0]]),
      { color: "#4ecdc4", weight: 2, opacity: 0.5, fillOpacity: 0.2 },
    ).addTo(map);
    mostrarMensagem(
      `⬠ Ponto ${pontoDesenho.length} adicionado. Clique múltiplas vezes ou duplo-clique para finalizar.`,
    );
  } else if (criarNovoEventoNoMapa) {
    document.getElementById("lat").value = e.latlng.lat.toFixed(4);
    document.getElementById("lng").value = e.latlng.lng.toFixed(4);

    if (marcadorTemp) {
      map.removeLayer(marcadorTemp);
    }

    marcadorTemp = L.circleMarker([e.latlng.lat, e.latlng.lng], {
      radius: 8,
      fillColor: "#007bff",
      color: "#0056b3",
      weight: 2,
      opacity: 1,
      fillOpacity: 0.8,
    }).addTo(map);

    mostrarMensagem(
      "📍 Coordenadas definidas! Clique em 'Salvar' para criar o evento.",
    );
  }
});

map.on("dblclick", async (e) => {
  if (modoDesenho === "linha" && pontoDesenho.length >= 2) {
    const nome = prompt("Nome da linha:", "Linha sem nome");
    if (nome === null) return;

    try {
      const res = await fetch("http://localhost:3000/linhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          descricao: "",
          coordenadas: pontoDesenho,
        }),
      });
      if (res.ok) {
        mostrarMensagem("📏 Linha salva com sucesso!");
        cancelarModoDesenho();
        carregarLinhas();
      }
    } catch (error) {
      console.error("Erro ao salvar linha:", error);
      alert("Erro ao salvar linha");
    }
  } else if (modoDesenho === "poligono" && pontoDesenho.length >= 3) {
    const nome = prompt("Nome do polígono:", "Polígono sem nome");
    if (nome === null) return;

    try {
      const res = await fetch("http://localhost:3000/poligonos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome,
          descricao: "",
          coordenadas: pontoDesenho,
        }),
      });
      if (res.ok) {
        mostrarMensagem("⬠ Polígono salvo com sucesso!");
        cancelarModoDesenho();
        carregarPoligonos();
      }
    } catch (error) {
      console.error("Erro ao salvar polígono:", error);
      alert("Erro ao salvar polígono");
    }
  }
});

carregarEventos();
carregarLinhas();
carregarPoligonos();
