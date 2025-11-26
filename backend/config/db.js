import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: {
    rejectUnauthorized: false
  }
});

// Verificar conexión
pool.getConnection()
  .then(connection => {
    console.log("✓ Conectado a MySQL - Base de datos:", process.env.DB_NAME);
    connection.release();
  })
  .catch(err => {
    console.error("✗ Error al conectar a MySQL:", err);
  });
