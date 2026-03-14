# API REST

Base URL (frontend): configurada em `API_URL` em `ui.js` (ex.: `http://localhost:3000`).

Respostas em JSON. Geometrias seguem o padrão GeoJSON quando aplicável.

---

## Pontos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/pontos` | Lista todos os pontos (FeatureCollection GeoJSON). |
| POST | `/pontos` | Cria ponto. Body: `{ geometry, properties: { nome, descricao } }`. |
| PUT | `/pontos/:id` | Atualiza nome e descrição. Body: `{ nome, descricao }`. |
| PUT | `/pontos/:id/coordenadas` | Atualiza só a localização. Body: `{ lat, lng }`. |
| PUT | `/pontos/:id/geometria` | Atualiza geometria. Body: GeoJSON geometry. |
| DELETE | `/pontos/:id` | Remove o ponto. |

---

## Linhas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/linhas` | Lista todas as linhas (GeoJSON com coordenadas). |
| POST | `/linhas` | Cria linha. Body: `{ nome, descricao, coordenadas: [[lat,lng], ...] }`. |
| PUT | `/linhas/:id` | Atualiza nome, descrição e geometria. Body: `{ nome, descricao, coordenadas }`. |
| DELETE | `/linhas/:id` | Remove a linha. |

---

## Polígonos

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/poligonos` | Lista todos os polígonos (GeoJSON com coordenadas). |
| POST | `/poligonos` | Cria polígono. Body: `{ nome, descricao, coordenadas: [[lat,lng], ...] }`. |
| PUT | `/poligonos/:id` | Atualiza nome, descrição e geometria. Body: `{ nome, descricao, coordenadas }`. |
| DELETE | `/poligonos/:id` | Remove o polígono. |

---

## Importação GeoJSON

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/import/geojson` | Importa várias features. Body: `{ features: Feature[] }`. Cada feature é roteada pelo `geometry.type`: **Point** → tabela pontos, **LineString** → linhas, **Polygon** → polígonos. Propriedades usadas: `nome`/`name`, `descricao`/`description`. Resposta: `{ imported, pontos, linhas, poligonos }`. |

---