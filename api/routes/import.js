import express from "express";
import pool from "../db.js";

const router = express.Router();

router.post("/geojson", async (req, res) => {
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

export default router;
