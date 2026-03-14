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

app.get("/pontos", async (req, res) => {
  const result = await pool.query(`
    SELECT
      id,
      nome,
      descricao,
      ST_AsGeoJSON(localizacao)::json as geometry
    FROM pontos
  `);

  const geojson = {
    type: "FeatureCollection",
    features: result.rows.map((row) => ({
      type: "Feature",
      geometry: row.geometry,
      properties: {
        id: row.id,
        nome: row.nome,
        descricao: row.descricao,
      },
    })),
  };

  res.json(geojson);
});

app.post("/pontos", async (req, res) => {
  try {
    const { geometry, properties } = req.body;

    if (!geometry || !properties) {
      return res.status(400).json({ error: "GeoJSON inválido" });
    }

    const result = await pool.query(
      `
      INSERT INTO pontos (nome, descricao, localizacao)
      VALUES (
        $1,
        $2,
        ST_SetSRID(ST_GeomFromGeoJSON($3),4326)
      )
      RETURNING 
        id,
        nome,
        descricao,
        ST_AsGeoJSON(localizacao)::json as geometry
      `,
      [properties.nome, properties.descricao ?? null, JSON.stringify(geometry)],
    );

    const row = result.rows[0];

    res.json({
      type: "Feature",
      geometry: row.geometry,
      properties: {
        id: row.id,
        nome: row.nome,
        descricao: row.descricao,
      },
    });
  } catch (err) {
    console.error("Erro ao inserir ponto:", err);
    res.status(500).json({ error: err.message });
  }
});

app.put("/pontos/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, descricao } = req.body;

  const result = await pool.query(
    `
    UPDATE pontos
    SET nome=$1, descricao=$2
    WHERE id=$3
    RETURNING id,nome,descricao,ST_AsGeoJSON(localizacao)::json as geometry
  `,
    [nome, descricao, id],
  );

  res.json(result.rows[0]);
});

app.delete("/pontos/:id", async (req, res) => {
  const { id } = req.params;

  const result = await pool.query(
    `DELETE FROM pontos WHERE id = $1 RETURNING id`,
    [id],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Ponto não encontrado" });
  }

  res.json({ success: true, id });
});

app.post("/pontos/import/geojson", async (req, res) => {
  const { features } = req.body;

  if (!Array.isArray(features)) {
    return res.status(400).json({ error: "GeoJSON inválido" });
  }

  const results = [];

  for (const feature of features) {
    const { properties, geometry } = feature;

    const nome = properties?.nome || properties?.name || "Elemento importado";
    const descricao = properties?.descricao || properties?.description || "";

    try {
      const result = await pool.query(
        `
        INSERT INTO pontos (nome, descricao, localizacao)
        VALUES (
          $1,
          $2,
          ST_SetSRID(ST_GeomFromGeoJSON($3),4326)
        )
        RETURNING id, nome, descricao, ST_AsGeoJSON(localizacao) as geometry
        `,
        [nome, descricao, JSON.stringify(geometry)],
      );

      results.push(result.rows[0]);
    } catch (error) {
      console.error("Erro ao importar:", error);
    }
  }

  res.json({ imported: results.length, elementos: results });
});

app.post("/import/geojson", async (req, res) => {
  const { features } = req.body;

  if (!Array.isArray(features)) {
    return res.status(400).json({ error: "GeoJSON inválido" });
  }

  const counts = { pontos: 0, linhas: 0, poligonos: 0 };

  for (const feature of features) {
    const { properties = {}, geometry } = feature;
    if (!geometry || !geometry.type) continue;

    const nome = properties.nome || properties.name || "Elemento importado";
    const descricao = properties.descricao || properties.description || "";

    try {
      if (geometry.type === "Point") {
        await pool.query(
          `
          INSERT INTO pontos (nome, descricao, localizacao)
          VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326))
          `,
          [nome, descricao, JSON.stringify(geometry)],
        );
        counts.pontos += 1;
      } else if (geometry.type === "LineString") {
        const coords = geometry.coordinates;
        if (!Array.isArray(coords) || coords.length < 2) continue;
        const coordsStr = coords.map((c) => `${c[0]} ${c[1]}`).join(",");
        await pool.query(
          `
          INSERT INTO linhas (nome, descricao, geometria)
          VALUES ($1, $2, ST_SetSRID(ST_GeomFromText('LINESTRING(${coordsStr})'), 4326))
          `,
          [nome, descricao],
        );
        counts.linhas += 1;
      } else if (geometry.type === "Polygon") {
        const ring = geometry.coordinates[0];
        if (!Array.isArray(ring) || ring.length < 3) continue;
        const coords = ring.slice(0, -1).map((c) => `${c[0]} ${c[1]}`).join(",");
        const coordsComFecho = coords + "," + ring[0][0] + " " + ring[0][1];
        await pool.query(
          `
          INSERT INTO poligonos (nome, descricao, geometria)
          VALUES ($1, $2, ST_SetSRID(ST_GeomFromText('POLYGON((${coordsComFecho}))'), 4326))
          `,
          [nome, descricao],
        );
        counts.poligonos += 1;
      }
    } catch (error) {
      console.error("Erro ao importar feature:", error);
    }
  }

  res.json({
    imported: counts.pontos + counts.linhas + counts.poligonos,
    pontos: counts.pontos,
    linhas: counts.linhas,
    poligonos: counts.poligonos,
  });
});

app.put("/pontos/:id/coordenadas", async (req, res) => {
  const { id } = req.params;
  const { lat, lng } = req.body;

  const result = await pool.query(
    `
  UPDATE pontos
  SET localizacao = ST_SetSRID(ST_MakePoint($1,$2),4326)
  WHERE id = $3
  RETURNING id, nome, descricao, ST_AsGeoJSON(localizacao) as geometry
 `,
    [lng, lat, id],
  );

  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Ponto não encontrado" });
  }

  res.json(result.rows[0]);
});

app.put("/pontos/:id/geometria", async (req, res) => {
  const { id } = req.params;
  const { geometry } = req.body;

  const result = await pool.query(
    `
    UPDATE pontos
    SET localizacao = ST_SetSRID(ST_GeomFromGeoJSON($1),4326)
    WHERE id=$2
    RETURNING id,nome,descricao,ST_AsGeoJSON(localizacao)::json as geometry
  `,
    [JSON.stringify(geometry), id],
  );

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

app.put("/linhas/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, coordenadas } = req.body;

  if (nome !== undefined || descricao !== undefined) {
    await pool.query(
      `UPDATE linhas SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao) WHERE id = $3`,
      [nome ?? null, descricao ?? null, id],
    );
  }

  if (Array.isArray(coordenadas) && coordenadas.length >= 2) {
    const coords = coordenadas.map((c) => `${c[0]} ${c[1]}`).join(",");
    await pool.query(
      `UPDATE linhas SET geometria = ST_SetSRID(ST_GeomFromText('LINESTRING(${coords})'),4326) WHERE id = $1`,
      [id],
    );
  }

  const result = await pool.query(
    `SELECT id, nome, descricao, ST_AsGeoJSON(geometria) as geometry FROM linhas WHERE id = $1`,
    [id],
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Linha não encontrada" });
  }
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

app.put("/poligonos/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, descricao, coordenadas } = req.body;

  if (nome !== undefined || descricao !== undefined) {
    await pool.query(
      `UPDATE poligonos SET nome = COALESCE($1, nome), descricao = COALESCE($2, descricao) WHERE id = $3`,
      [nome ?? null, descricao ?? null, id],
    );
  }

  if (Array.isArray(coordenadas) && coordenadas.length >= 3) {
    const coords = coordenadas.map((c) => `${c[0]} ${c[1]}`).join(",");
    const coordsComFecho = coords + "," + coordenadas[0][0] + " " + coordenadas[0][1];
    await pool.query(
      `UPDATE poligonos SET geometria = ST_SetSRID(ST_GeomFromText('POLYGON((${coordsComFecho}))'),4326) WHERE id = $1`,
      [id],
    );
  }

  const result = await pool.query(
    `SELECT id, nome, descricao, ST_AsGeoJSON(geometria) as geometry FROM poligonos WHERE id = $1`,
    [id],
  );
  if (result.rows.length === 0) {
    return res.status(404).json({ error: "Polígono não encontrado" });
  }
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
