import express from "express";
import pool from "../db.js";

const router = express.Router();

router.get("/", async (req, res) => {
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

router.post("/", async (req, res) => {
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

router.put("/:id", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
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

export default router;
