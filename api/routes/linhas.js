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
    FROM linhas
  `);
  res.json(result.rows);
});

router.post("/", async (req, res) => {
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

router.put("/:id", async (req, res) => {
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

router.delete("/:id", async (req, res) => {
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

export default router;
