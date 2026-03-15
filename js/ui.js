const FORM_IDS = [
  "formCriar",
  "formEditar",
  "formImportar",
  "formCriarLinha",
  "formCriarPoligono",
  "formEditarLinha",
  "formEditarPoligono",
];

function esconderTodosFormularios() {
  FORM_IDS.forEach((id) => document.getElementById(id).classList.add("hidden"));
}

function mostrarMensagem(msg) {
  const el = document.getElementById("successMsg");
  el.textContent = msg;
  el.classList.add("show");
  setTimeout(() => el.classList.remove("show"), 3000);
}

function mostrarFormularioCriar() {
  ativarModoDesenhoPonto();
  esconderTodosFormularios();
  document.getElementById("formCriar").classList.remove("hidden");
  document.getElementById("nome").focus();
}

function mostrarFormularioImportar() {
  esconderTodosFormularios();
  document.getElementById("formImportar").classList.remove("hidden");
}

function cancelarFormulario() {
  esconderTodosFormularios();
  modoDesenho = null;
  criarNovoPontoNoMapa = false;
  pontoEmEdicao = null;
  linhaEmEdicao = null;
  poligonoEmEdicao = null;
  if (linhaEmEdicaoId || poligonoEmEdicaoId) {
    cancelarModoDesenho();
  }
  if (linhaEmEdicaoId) {
    carregarLinhas();
  }
  if (poligonoEmEdicaoId) {
    carregarPoligonos();
  }
  linhaEmEdicaoId = null;
  poligonoEmEdicaoId = null;
  atualizarBotoesDesenho();
  const fileInput = document.getElementById("fileImport");
  if (fileInput) fileInput.value = "";
  const pontoCoords = document.getElementById("pontoCoordenadas");
  if (pontoCoords) pontoCoords.value = "";
  const latInput = document.getElementById("lat");
  const lngInput = document.getElementById("lng");
  if (latInput) latInput.value = "";
  if (lngInput) lngInput.value = "";
  if (marcadorTemp) {
    map.removeLayer(marcadorTemp);
    marcadorTemp = null;
  }
}

function filtrarLista(tipo) {
  let features = [];

  if (tipo === "pontos" || tipo === "todos") {
    features = features.concat(pontosParaFeaturesLista());
  }
  if (tipo === "linhas" || tipo === "todos") {
    features = features.concat(linhasParaFeaturesLista());
  }
  if (tipo === "poligonos" || tipo === "todos") {
    features = features.concat(poligonosParaFeaturesLista());
  }

  atualizarLista(features);
}

function alternarLista() {
  const wrapper = document.getElementById("listaWrapper");
  const btn = document.getElementById("btnToggleLista");
  if (!wrapper || !btn) return;

  const estaOculto = wrapper.classList.toggle("hidden");
  btn.textContent = estaOculto ? "Mostrar" : "Ocultar";
}

function iniciarCriacaoLinhaOuPoligono(
  formVisivel,
  formOculto,
  nomeInputId,
  coordElementId,
  ativarModo,
) {
  ativarModo();
  esconderTodosFormularios();
  document.getElementById(formVisivel).classList.remove("hidden");
  const elNome = document.getElementById(nomeInputId);
  if (elNome) elNome.focus();
  atualizarCoordenadasForm(coordElementId);
}

function iniciarCriacaoLinha() {
  iniciarCriacaoLinhaOuPoligono(
    "formCriarLinha",
    "formCriarPoligono",
    "linhaNome",
    "linhaCoordenadas",
    ativarModoDesenhoLinha,
  );
}

function iniciarCriacaoPoligono() {
  iniciarCriacaoLinhaOuPoligono(
    "formCriarPoligono",
    "formCriarLinha",
    "poligonoNome",
    "poligonoCoordenadas",
    ativarModoDesenhoPoligono,
  );
}

async function carregarPontos() {
  try {
    const res = await fetch(`${API_URL}/pontos`);
    const data = await res.json();
    colecaoPontos = data.features || [];

    if (camadaGeoJSON) {
      map.removeLayer(camadaGeoJSON);
    }

    camadaGeoJSON = L.geoJSON(data, {
      pointToLayer: function (feature, latlng) {
        const marker = L.marker(latlng, { draggable: true });

        marker.on("dragend", async () => {
          const novasCoords = marker.getLatLng();

          try {
            const resDrag = await fetch(
              `${API_URL}/pontos/${feature.properties.id}/coordenadas`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  lat: novasCoords.lat,
                  lng: novasCoords.lng,
                }),
              },
            );

            if (resDrag.ok) {
              mostrarMensagem("Coordenadas atualizadas!");
            }
          } catch (error) {
            console.error("Erro ao atualizar coordenadas:", error);
          }
        });

        return marker;
      },

      onEachFeature: function (feature, layer) {
        const props = feature.properties;

        layer.bindPopup(`
          <b>${props.nome}</b><br>
          ${props.descricao || ""}
        `);

        layer.on("click", () => {
          pontoEmEdicao = feature;
          mostrarFormularioEditar(feature);
        });
      },
    }).addTo(map);
  } catch (error) {
    console.error("Erro ao carregar pontos:", error);
  }
}

function pontosParaFeaturesLista() {
  if (!Array.isArray(colecaoPontos)) return [];
  return colecaoPontos.map((f) => ({
    ...f,
    properties: {
      ...(f.properties || {}),
      tipo: "ponto",
    },
  }));
}

function linhasParaFeaturesLista() {
  return Object.values(linhas)
    .map((item) => {
      const linha = item.data;
      if (!linha) return null;
      let geometry = linha.geometry;
      if (typeof geometry === "string") {
        try {
          geometry = JSON.parse(geometry);
        } catch (e) {
          return null;
        }
      }
      if (!geometry || geometry.type !== "LineString") return null;
      return {
        type: "Feature",
        geometry,
        properties: {
          id: linha.id,
          nome: linha.nome,
          descricao: linha.descricao || "",
          tipo: "linha",
        },
      };
    })
    .filter(Boolean);
}

function poligonosParaFeaturesLista() {
  return Object.values(poligonos)
    .map((item) => {
      const poligono = item.data;
      if (!poligono) return null;
      let geometry = poligono.geometry;
      if (typeof geometry === "string") {
        try {
          geometry = JSON.parse(geometry);
        } catch (e) {
          return null;
        }
      }
      if (!geometry || geometry.type !== "Polygon") return null;
      return {
        type: "Feature",
        geometry,
        properties: {
          id: poligono.id,
          nome: poligono.nome,
          descricao: poligono.descricao || "",
          tipo: "poligono",
        },
      };
    })
    .filter(Boolean);
}

function atualizarLista(features) {
  const lista = document.getElementById("listaElementos");
  lista.innerHTML = "";

  if (!features || features.length === 0) {
    lista.innerHTML =
      "<p style='color:#aaa;text-align:center;padding:20px;'>Nenhum elemento</p>";
    return;
  }

  features.forEach((feature) => {
    const props = feature.properties || {};
    const geo = feature.geometry || {};

    let coordsText = "";
    if (geo.type === "Point") {
      const [lng, lat] = geo.coordinates;
      coordsText = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } else if (geo.type === "LineString" || geo.type === "Polygon") {
      coordsText = geo.type;
    } else {
      coordsText = geo.type || "";
    }

    let tipo = props.tipo;
    if (!tipo) {
      if (geo.type === "Point") tipo = "ponto";
      else if (geo.type === "LineString") tipo = "linha";
      else if (geo.type === "Polygon") tipo = "poligono";
    }

    let acoesHtml = "";
    if (tipo === "ponto") {
      acoesHtml = `
        <button class="edit" onclick="editarPonto(${props.id})">Editar</button>
        <button class="delete" onclick="deletarPonto(${props.id})">Deletar</button>
      `;
    } else if (tipo === "linha") {
      acoesHtml = `
        <button class="edit" onclick="editarLinha(${props.id})">Editar</button>
        <button class="delete" onclick="deletarLinha(${props.id})">Deletar</button>
      `;
    } else if (tipo === "poligono") {
      acoesHtml = `
        <button class="edit" onclick="editarPoligono(${props.id})">Editar</button>
        <button class="delete" onclick="deletarPoligono(${props.id})">Deletar</button>
      `;
    }

    const labelTipo =
      tipo === "ponto"
        ? "Ponto"
        : tipo === "linha"
          ? "Linha"
          : tipo === "poligono"
            ? "Polígono"
            : "";

    const item = document.createElement("div");
    item.className = "ponto-item";

    item.innerHTML = `
      <h4>${props.nome}${labelTipo ? ` <span style="font-size:11px;color:#888;">(${labelTipo})</span>` : ""}</h4>
      <p>${props.descricao || "Sem descrição"}</p>
      <p style="font-size:11px;">${coordsText}</p>

      <div class="ponto-actions">
        ${acoesHtml}
      </div>
    `;

    lista.appendChild(item);
  });
}

function mostrarFormularioEditar(feature) {
  const props = feature.properties || feature;
  esconderTodosFormularios();
  document.getElementById("editNome").value = props.nome;
  document.getElementById("editDescricao").value = props.descricao || "";
  document.getElementById("editCoordenadas").value = feature.geometry
    ? feature.geometry.type === "Point"
      ? `${feature.geometry.coordinates[1].toFixed(4)}, ${feature.geometry.coordinates[0].toFixed(4)}`
      : feature.geometry.type
    : "";
  document.getElementById("formEditar").classList.remove("hidden");
}

function editarPonto(id) {
  const feature =
    colecaoPontos.find((f) => f.properties && f.properties.id === id) || null;
  if (!feature) return;

  pontoEmEdicao = feature;
  mostrarFormularioEditar(feature);
}

function editarLinha(id) {
  const item = linhas[id];
  if (!item || !item.data) return;
  mostrarFormularioEditarLinha(item.data);
}

function editarPoligono(id) {
  const item = poligonos[id];
  if (!item || !item.data) return;
  mostrarFormularioEditarPoligono(item.data);
}

function formatarCoordenadasParaTexto(coordenadas) {
  if (!coordenadas || coordenadas.length === 0) return "";
  return coordenadas
    .map(
      ([lng, lat], idx) =>
        `${idx + 1}: ${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`,
    )
    .join("\n");
}

/** Parseia texto do textarea de coordenadas. Retorna array de [lng, lat] ou null se inválido. */
function parsearCoordenadasDoTexto(texto) {
  if (!texto || !String(texto).trim()) return null;
  const linhas = String(texto)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const coords = [];
  for (const linha of linhas) {
    const semNumero = linha.replace(/^\d+\s*:\s*/, "").trim();
    const partes = semNumero.split(/[\s,]+/).filter(Boolean);
    if (partes.length >= 2) {
      const lat = parseFloat(partes[0]);
      const lng = parseFloat(partes[1]);
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
        coords.push([lng, lat]);
      }
    }
  }
  return coords.length > 0 ? coords : null;
}

function mostrarFormularioEditarLinha(linha) {
  let geometry = linha.geometry;
  if (typeof geometry === "string") {
    try {
      geometry = JSON.parse(geometry);
    } catch (e) {
      return;
    }
  }
  if (!geometry || geometry.type !== "LineString") return;
  const coordenadas = geometry.coordinates.map((c) => [c[0], c[1]]);
  linhaEmEdicao = {
    id: linha.id,
    nome: linha.nome,
    descricao: linha.descricao || "",
    coordenadas,
  };
  esconderTodosFormularios();
  document.getElementById("editLinhaNome").value = linhaEmEdicao.nome;
  document.getElementById("editLinhaDescricao").value = linhaEmEdicao.descricao;
  document.getElementById("editLinhaCoordenadas").value =
    formatarCoordenadasParaTexto(linhaEmEdicao.coordenadas);
  document.getElementById("formEditarLinha").classList.remove("hidden");
}

function mostrarFormularioEditarPoligono(poligono) {
  let geometry = poligono.geometry;
  if (typeof geometry === "string") {
    try {
      geometry = JSON.parse(geometry);
    } catch (e) {
      return;
    }
  }
  if (!geometry || geometry.type !== "Polygon") return;
  const ring = geometry.coordinates[0];
  const coordenadas = ring.slice(0, -1).map((c) => [c[0], c[1]]);
  poligonoEmEdicao = {
    id: poligono.id,
    nome: poligono.nome,
    descricao: poligono.descricao || "",
    coordenadas,
  };
  esconderTodosFormularios();
  document.getElementById("editPoligonoNome").value = poligonoEmEdicao.nome;
  document.getElementById("editPoligonoDescricao").value =
    poligonoEmEdicao.descricao;
  document.getElementById("editPoligonoCoordenadas").value =
    formatarCoordenadasParaTexto(poligonoEmEdicao.coordenadas);
  document.getElementById("formEditarPoligono").classList.remove("hidden");
}

async function atualizarLinha() {
  if (!linhaEmEdicao) return;
  const nome = document.getElementById("editLinhaNome").value;
  const descricao = document.getElementById("editLinhaDescricao").value;
  const textoCoords = document.getElementById("editLinhaCoordenadas").value;
  if (!nome.trim()) {
    alert("Nome é obrigatório");
    return;
  }
  const coordenadas = parsearCoordenadasDoTexto(textoCoords);
  if (!coordenadas || coordenadas.length < 2) {
    alert(
      "Informe pelo menos 2 coordenadas (uma por linha). Formato: lat, lng",
    );
    return;
  }
  try {
    const res = await fetch(`${API_URL}/linhas/${linhaEmEdicao.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, descricao, coordenadas }),
    });
    if (res.ok) {
      mostrarMensagem("Linha atualizada!");
      cancelarFormulario();
      carregarLinhas();
    }
  } catch (error) {
    console.error("Erro ao atualizar linha:", error);
    alert("Erro ao atualizar linha");
  }
}

async function atualizarPoligono() {
  if (!poligonoEmEdicao) return;
  const nome = document.getElementById("editPoligonoNome").value;
  const descricao = document.getElementById("editPoligonoDescricao").value;
  const textoCoords = document.getElementById("editPoligonoCoordenadas").value;
  if (!nome.trim()) {
    alert("Nome é obrigatório");
    return;
  }
  const coordenadas = parsearCoordenadasDoTexto(textoCoords);
  if (!coordenadas || coordenadas.length < 3) {
    alert(
      "Informe pelo menos 3 coordenadas (uma por linha). Formato: lat, lng",
    );
    return;
  }
  try {
    const res = await fetch(`${API_URL}/poligonos/${poligonoEmEdicao.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, descricao, coordenadas }),
    });
    if (res.ok) {
      mostrarMensagem("Polígono atualizado!");
      cancelarFormulario();
      carregarPoligonos();
    }
  } catch (error) {
    console.error("Erro ao atualizar polígono:", error);
    alert("Erro ao atualizar polígono");
  }
}

function iniciarRedesenhoLinha() {
  if (!linhaEmEdicao) return;
  linhaEmEdicaoId = linhaEmEdicao.id;
  if (linhas[linhaEmEdicao.id] && linhas[linhaEmEdicao.id].layer) {
    map.removeLayer(linhas[linhaEmEdicao.id].layer);
  }
  esconderTodosFormularios();
  document.getElementById("linhaNome").value =
    document.getElementById("editLinhaNome").value;
  document.getElementById("linhaDescricao").value =
    document.getElementById("editLinhaDescricao").value;
  document.getElementById("formCriarLinha").classList.remove("hidden");
  ativarModoDesenhoLinha();
  pontoDesenho = linhaEmEdicao.coordenadas.map((c) => [c[0], c[1]]);
  atualizarCoordenadasForm("linhaCoordenadas");
  atualizarTempLinhaNoMapa();
  desenharVerticesArrastaveis();
  linhaEmEdicao = null;
}

function iniciarRedesenhoPoligono() {
  if (!poligonoEmEdicao) return;
  poligonoEmEdicaoId = poligonoEmEdicao.id;
  if (poligonos[poligonoEmEdicao.id] && poligonos[poligonoEmEdicao.id].layer) {
    map.removeLayer(poligonos[poligonoEmEdicao.id].layer);
  }
  esconderTodosFormularios();
  document.getElementById("poligonoNome").value =
    document.getElementById("editPoligonoNome").value;
  document.getElementById("poligonoDescricao").value = document.getElementById(
    "editPoligonoDescricao",
  ).value;
  document.getElementById("formCriarPoligono").classList.remove("hidden");
  ativarModoDesenhoPoligono();
  pontoDesenho = poligonoEmEdicao.coordenadas.map((c) => [c[0], c[1]]);
  atualizarCoordenadasForm("poligonoCoordenadas");
  atualizarTempPoligonoNoMapa();
  desenharVerticesArrastaveis();
  poligonoEmEdicao = null;
}

async function atualizarPonto() {
  if (!pontoEmEdicao) return;

  const nome = document.getElementById("editNome").value;
  const descricao = document.getElementById("editDescricao").value;
  const textoCoords = document.getElementById("editCoordenadas").value;

  if (!nome.trim()) {
    alert("Nome é obrigatório");
    return;
  }

  const coords = parsearCoordenadasDoTexto(textoCoords);
  if (coords && coords.length >= 1) {
    const [lng, lat] = coords[0];
    try {
      const resCoord = await fetch(
        `${API_URL}/pontos/${pontoEmEdicao.properties.id}/coordenadas`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        },
      );
      if (!resCoord.ok) {
        alert("Coordenadas inválidas. Use o formato: lat, lng");
        return;
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao atualizar coordenadas");
      return;
    }
  }

  try {
    const res = await fetch(
      `${API_URL}/pontos/${pontoEmEdicao.properties.id}`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, descricao }),
      },
    );

    if (res.ok) {
      mostrarMensagem("Elemento atualizado com sucesso!");
      cancelarFormulario();
      carregarPontos();
    }
  } catch (error) {
    console.error("Erro ao atualizar elemento:", error);
    alert("Erro ao atualizar elemento");
  }
}

async function deletarPonto(id) {
  if (!confirm("Tem certeza que deseja deletar este ponto?")) return;

  try {
    const res = await fetch(`${API_URL}/pontos/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      mostrarMensagem("Ponto deletado com sucesso!");
      cancelarFormulario();
      carregarPontos();
    }
  } catch (error) {
    console.error("Erro ao deletar ponto:", error);
    alert("Erro ao deletar ponto");
  }
}

function deletarPontoDoForm() {
  if (!pontoEmEdicao) return;
  deletarPonto(pontoEmEdicao.properties.id);
}

async function deletarLinha(id) {
  if (!confirm("Tem certeza que deseja deletar esta linha?")) return;
  try {
    const res = await fetch(`${API_URL}/linhas/${id}`, { method: "DELETE" });
    if (res.ok) {
      mostrarMensagem("Linha deletada com sucesso!");
      cancelarFormulario();
      carregarLinhas();
    }
  } catch (error) {
    console.error("Erro ao deletar linha:", error);
    alert("Erro ao deletar linha");
  }
}

function deletarLinhaDoForm() {
  if (!linhaEmEdicao) return;
  deletarLinha(linhaEmEdicao.id);
}

async function deletarPoligono(id) {
  if (!confirm("Tem certeza que deseja deletar este polígono?")) return;
  try {
    const res = await fetch(`${API_URL}/poligonos/${id}`, { method: "DELETE" });
    if (res.ok) {
      mostrarMensagem("Polígono deletado com sucesso!");
      cancelarFormulario();
      carregarPoligonos();
    }
  } catch (error) {
    console.error("Erro ao deletar polígono:", error);
    alert("Erro ao deletar polígono");
  }
}

function deletarPoligonoDoForm() {
  if (!poligonoEmEdicao) return;
  deletarPoligono(poligonoEmEdicao.id);
}

async function salvarPonto() {
  const nome = document.getElementById("nome").value;
  const descricao = document.getElementById("descricao").value;
  const lat = parseFloat(document.getElementById("lat").value);
  const lng = parseFloat(document.getElementById("lng").value);

  if (!nome.trim() || isNaN(lat) || isNaN(lng)) {
    alert("Preencha todos os campos obrigatórios");
    return;
  }

  const feature = {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [lng, lat],
    },
    properties: {
      nome,
      descricao,
    },
  };

  try {
    const res = await fetch(`${API_URL}/pontos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feature),
    });

    if (res.ok) {
      mostrarMensagem("Ponto criado com sucesso!");

      if (marcadorTemp) {
        map.removeLayer(marcadorTemp);
        marcadorTemp = null;
      }

      cancelarFormulario();

      document.getElementById("nome").value = "";
      document.getElementById("descricao").value = "";
      document.getElementById("lat").value = "";
      document.getElementById("lng").value = "";

      carregarPontos();
    }
  } catch (error) {
    console.error("Erro ao criar ponto:", error);
    alert("Erro ao criar ponto");
  }
}

async function importarArquivo(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    let features = [];
    if (data.type === "FeatureCollection" && data.features) {
      features = data.features;
    } else if (Array.isArray(data)) {
      features = data.map((ponto) => ({
        properties: ponto,
        geometry: {
          type: "Point",
          coordinates: [
            ponto.lng || ponto.longitude,
            ponto.lat || ponto.latitude,
          ],
        },
      }));
    }

    if (features.length === 0) {
      alert("Nenhum elemento encontrado no arquivo");
      return;
    }

    const res = await fetch(`${API_URL}/import/geojson`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ features }),
    });

    const result = await res.json();
    const { pontos = 0, linhas = 0, poligonos = 0 } = result;
    const partes = [];
    if (pontos) partes.push(`${pontos} ponto(s)`);
    if (linhas) partes.push(`${linhas} linha(s)`);
    if (poligonos) partes.push(`${poligonos} polígono(s)`);
    mostrarMensagem(
      partes.length
        ? `${partes.join(", ")} importados com sucesso!`
        : "Nenhum elemento importado.",
    );
    cancelarFormulario();
    carregarPontos();
    carregarLinhas();
    carregarPoligonos();
  } catch (error) {
    console.error("Erro ao importar arquivo:", error);
    alert("Erro ao processar arquivo. Verifique o formato JSON/GeoJSON");
  }
}

async function salvarLinha() {
  const nome = document.getElementById("linhaNome").value;
  const descricao = document.getElementById("linhaDescricao").value;

  if (!nome.trim()) {
    alert("Nome é obrigatório");
    return;
  }

  if (!pontoDesenho || pontoDesenho.length < 2) {
    alert("Desenhe pelo menos 2 pontos no mapa para criar uma linha");
    return;
  }

  try {
    const url = linhaEmEdicaoId
      ? `${API_URL}/linhas/${linhaEmEdicaoId}`
      : `${API_URL}/linhas`;
    const method = linhaEmEdicaoId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        descricao,
        coordenadas: pontoDesenho,
      }),
    });

    if (res.ok) {
      mostrarMensagem(
        linhaEmEdicaoId ? "Linha atualizada!" : "Linha salva com sucesso!",
      );
      linhaEmEdicaoId = null;
      document.getElementById("linhaNome").value = "";
      document.getElementById("linhaDescricao").value = "";
      document.getElementById("linhaCoordenadas").value = "";
      cancelarModoDesenho();
      cancelarFormulario();
      carregarLinhas();
    }
  } catch (error) {
    console.error("Erro ao salvar linha:", error);
    alert("Erro ao salvar linha");
  }
}

async function salvarPoligono() {
  const nome = document.getElementById("poligonoNome").value;
  const descricao = document.getElementById("poligonoDescricao").value;

  if (!nome.trim()) {
    alert("Nome é obrigatório");
    return;
  }

  if (!pontoDesenho || pontoDesenho.length < 3) {
    alert("Desenhe pelo menos 3 pontos no mapa para criar um polígono");
    return;
  }

  try {
    const url = poligonoEmEdicaoId
      ? `${API_URL}/poligonos/${poligonoEmEdicaoId}`
      : `${API_URL}/poligonos`;
    const method = poligonoEmEdicaoId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome,
        descricao,
        coordenadas: pontoDesenho,
      }),
    });

    if (res.ok) {
      mostrarMensagem(
        poligonoEmEdicaoId
          ? "Polígono atualizado!"
          : "Polígono salvo com sucesso!",
      );
      poligonoEmEdicaoId = null;
      document.getElementById("poligonoNome").value = "";
      document.getElementById("poligonoDescricao").value = "";
      document.getElementById("poligonoCoordenadas").value = "";
      cancelarModoDesenho();
      cancelarFormulario();
      carregarPoligonos();
    }
  } catch (error) {
    console.error("Erro ao salvar polígono:", error);
    alert("Erro ao salvar polígono");
  }
}
