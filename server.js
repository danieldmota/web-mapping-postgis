import "dotenv/config";
import cors from "cors";
import express from "express";

import pontosRouter from "./api/routes/pontos.js";
import linhasRouter from "./api/routes/linhas.js";
import poligonosRouter from "./api/routes/poligonos.js";
import importRouter from "./api/routes/import.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/pontos", pontosRouter);
app.use("/linhas", linhasRouter);
app.use("/poligonos", poligonosRouter);
app.use("/import", importRouter);

app.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
