// backend/models/facturaModel.js
import { pool } from "../config/db.js";
export const crearFactura = async (factura) => {
  const [result] = await pool.query(
    `INSERT INTO facturas (numero, cliente_nombre, cliente_documento, fecha_emision, total, estado)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      factura.numero,
      factura.cliente.nombre,
      factura.cliente.ruc || factura.cliente.documento,
      factura.fecha_emision || new Date(),
      factura.total,
      factura.estado || "PENDIENTE",
    ]
  );
  return result.insertId;
};
export const agregarDetalle = async (facturaId, detalle) => {
  await pool.query(
    `INSERT INTO detalle_factura (factura_id, producto, cantidad, precio_unitario, subtotal)
     VALUES (?, ?, ?, ?, ?)`,
    [facturaId, detalle.producto, detalle.cantidad, detalle.precio_unitario, detalle.subtotal]
  );
};
export const actualizarEstado = async (facturaId, estado, mensaje = null) => {
  await pool.query(
    `UPDATE facturas SET estado = ?, mensaje = ? WHERE id = ?`,
    [estado, mensaje, facturaId]
  );
};
export const generarSiguienteNumero = async () => {
  const [rows] = await pool.query(`SELECT numero FROM facturas ORDER BY id DESC LIMIT 1`);
  if (rows.length === 0) return "F001-000001";

  const last = rows[0].numero;
  const [serie, correlativoStr] = last.split("-");
  const nuevo = String(parseInt(correlativoStr) + 1).padStart(6, "0");
  return `${serie}-${nuevo}`;
};

export const listarFacturas = async () => {
  const [rows] = await pool.query(`
    SELECT 
      f.id,
      f.numero,
      f.cliente_nombre,
      f.cliente_documento,
      DATE_FORMAT(f.fecha_emision, '%Y-%m-%d %H:%i:%s') AS fecha_emision,
      f.total,
      f.estado,
      f.mensaje,
      GROUP_CONCAT(CONCAT(d.producto, ' (x', d.cantidad, ')') SEPARATOR ', ') AS detalles
    FROM facturas f
    LEFT JOIN detalle_factura d ON f.id = d.factura_id
    GROUP BY f.id
    ORDER BY f.id DESC
  `);
  return rows;
};
