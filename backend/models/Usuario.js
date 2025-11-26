import { pool } from '../config/db.js';

export const crearUsuario = async (nombre, usuario, clave, email, rol = 'cajero') => {
  const query = 'INSERT INTO usuarios (nombre, usuario, clave, email, rol) VALUES (?, ?, ?, ?, ?)';
  const [result] = await pool.execute(query, [nombre, usuario, clave, email, rol]);
  return result.insertId;
};

export const buscarPorEmail = async (email) => {
  const query = 'SELECT * FROM usuarios WHERE email = ?';
  const [rows] = await pool.execute(query, [email]);
  return rows[0];
};

export const buscarPorUsuario = async (usuario) => {
  const query = 'SELECT * FROM usuarios WHERE usuario = ?';
  const [rows] = await pool.execute(query, [usuario]);
  return rows[0];
};

export const buscarPorId = async (id) => {
  const query = 'SELECT id, nombre, usuario, email, rol, creado_en FROM usuarios WHERE id = ?';
  const [rows] = await pool.execute(query, [id]);
  return rows[0];
};