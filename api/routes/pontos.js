import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
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

router.post("/", async (req, res) => {
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

router.post("/import/geojson", async (req, res) => {
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

router.put("/:id/coordenadas", async (req, res) => {
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

router.put("/:id/geometria", async (req, res) => {
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

router.put("/:id", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
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

export default router;
