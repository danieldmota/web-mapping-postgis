import cors from "cors";
import "dotenv/config";
import express from "express";
import { Pool } from "pg";

const app = express();

app.use(cors());

app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

console.log(process.env.DATABASE_URL);

app.get("/eventos", async (req, res) => {
  const result = await pool.query(`
 SELECT
  id,
  nome,
  descricao,
  ST_AsGeoJSON(localizacao) as geometry
 FROM eventos
 `);

  res.json(result.rows);
});

app.post("/eventos", async (req, res) => {
  const { nome, descricao, tipo, lat, lng } = req.body;

  const result = await pool.query(
    `
  INSERT INTO eventos (nome, descricao, tipo, localizacao)
  VALUES (
   $1,
   $2,
   $3,
   ST_SetSRID(ST_MakePoint($4,$5),4326)
  )
  RETURNING id, nome, descricao, tipo, ST_AsGeoJSON(localizacao) as geometry
 `,
    [nome, descricao, tipo, lng, lat],
  );

  res.json(result.rows[0]);
});

app.put("/eventos/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, tipo, lat, lng } = req.body;

  const result = await pool.query(
    `
  UPDATE eventos
  SET nome = $1, descricao = $2, tipo = $3, localizacao = ST_SetSRID(ST_MakePoint($4,$5),4326)
  WHERE id = $6
  RETURNING id, nome, descricao, tipo, ST_AsGeoJSON(localizacao) as geometry
 `,
    [nome, descricao, tipo, lng, lat, id],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Evento não encontrado" });
  }

  res.json(result.rows[0]);
});

app.delete("/eventos/:id", async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `DELETE FROM eventos WHERE id = $1 RETURNING id`,
    [id],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Evento não encontrado" });
  }

  res.json({ success: true, id });
});

app.post("/eventos/import/geojson", async (req, res) => {
  const { features } = req.body;

  if (!Array.isArray(features)) {
    return res.status(400).json({ error: "GeoJSON inválido" });
  }

  const results = [];

  for (const feature of features) {
    const { properties, geometry } = feature;
    const [lng, lat] = geometry.coordinates;
    const nome = properties.nome || properties.name || "Evento importado";
    const descricao = properties.descricao || properties.description || "";
    const tipo = properties.tipo || properties.type || "geral";

    try {
      const result = await pool.query(
        `
      INSERT INTO eventos (nome, descricao, tipo, localizacao)
      VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4,$5),4326))
      RETURNING id, nome, descricao, tipo, ST_AsGeoJSON(localizacao) as geometry
      `,
        [nome, descricao, tipo, lng, lat],
      );
      results.push(result.rows[0]);
    } catch (error) {
      console.error("Erro ao importar evento:", error);
    }
  }

  res.json({ imported: results.length, eventos: results });
});

app.put("/eventos/:id/coordenadas", async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;

  const result = await pool.query(
    `
  UPDATE eventos
  SET localizacao = ST_SetSRID(ST_MakePoint($1,$2),4326)
  WHERE id = $3
  RETURNING id, nome, descricao, tipo, ST_AsGeoJSON(localizacao) as geometry
 `,
    [lng, lat, id],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Evento não encontrado" });
  }

  res.json(result.rows[0]);
});

app.get("/linhas", async (req, res) => {
  const result = await pool.query(`
    SELECT
      id,
      nome,
      descricao,
      ST_AsGeoJSON(geometria) as geometry
    FROM linhas
  `);
  res.json(result.rows);
});

app.post("/linhas", async (req, res) => {
  const { nome, descricao, coordenadas } = req.body;

  if (!Array.isArray(coordenadas) || coordenadas.length < 2) {
    return res
      .status(400)
      .json({ error: "Pelo menos 2 pontos são necessários" });
  }

  const coords = coordenadas.map((c) => `${c[0]} ${c[1]}`).join(",");

  const result = await pool.query(
    `
    INSERT INTO linhas (nome, descricao, geometria)
    VALUES ($1, $2, ST_SetSRID(ST_GeomFromText('LINESTRING(${coords})',4326),4326))
    RETURNING id, nome, descricao, ST_AsGeoJSON(geometria) as geometry
    `,
    [nome || "Linha sem nome", descricao || ""],
  );

  res.json(result.rows[0]);
});

app.delete("/linhas/:id", async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `DELETE FROM linhas WHERE id = $1 RETURNING id`,
    [id],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Linha não encontrada" });
  }

  res.json({ success: true, id });
});

app.get("/poligonos", async (req, res) => {
  const result = await pool.query(`
    SELECT
      id,
      nome,
      descricao,
      ST_AsGeoJSON(geometria) as geometry
    FROM poligonos
  `);
  res.json(result.rows);
});

app.post("/poligonos", async (req, res) => {
  const { nome, descricao, coordenadas } = req.body;

  if (!Array.isArray(coordenadas) || coordenadas.length < 3) {
    return res
      .status(400)
      .json({ error: "Pelo menos 3 pontos são necessários" });
  }

  const coords = coordenadas.map((c) => `${c[0]} ${c[1]}`).join(",");
  const coordsComFecho =
    coords + "," + coordenadas[0][0] + " " + coordenadas[0][1];

  const result = await pool.query(
    `
    INSERT INTO poligonos (nome, descricao, geometria)
    VALUES ($1, $2, ST_SetSRID(ST_GeomFromText('POLYGON((${coordsComFecho}))',4326),4326))
    RETURNING id, nome, descricao, ST_AsGeoJSON(geometria) as geometry
    `,
    [nome || "Polígono sem nome", descricao || ""],
  );

  res.json(result.rows[0]);
});

app.delete("/poligonos/:id", async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `DELETE FROM poligonos WHERE id = $1 RETURNING id`,
    [id],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Polígono não encontrado" });
  }

  res.json({ success: true, id });
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
