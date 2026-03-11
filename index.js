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
  RETURNING *
 `,
    [nome, descricao, tipo, lng, lat],
  );

  res.json(result.rows[0]);
});

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
