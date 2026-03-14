import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false, // Desabilita SSL para conexões locais
});

export default pool;
