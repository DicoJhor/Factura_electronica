import { pool } from "../config/db.js";

export const getProductos = async (empresaId) => {
  const [rows] = await pool.query(
    "SELECT * FROM productos WHERE empresa_id = ? AND estado = 'ACTIVO'",
    [empresaId]
  );
  return rows;
};

export const crearProducto = async (productoData) => {
  const query = `
    INSERT INTO productos 
    (empresa_id, codigo, nombre, descripcion, precio, stock, stock_minimo,
     unidad_medida, categoria, codigo_barra, imagen, imagen_nombre, afecto_igv)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  
  const [result] = await pool.execute(query, [
    productoData.empresaId,
    productoData.codigo,
    productoData.nombre,
    productoData.descripcion,
    productoData.precio,
    productoData.stock || 0,
    productoData.stockMinimo || 0,
    productoData.unidadMedida || 'NIU',
    productoData.categoria,
    productoData.codigoBarra,
    productoData.imagen,
    productoData.imagenNombre,
    productoData.afectoIgv || 'SI'
  ]);
  
  return result.insertId;
};

export const buscarProductoPorId = async (id, empresaId) => {
  const query = `
    SELECT * FROM productos 
    WHERE id = ? AND empresa_id = ? AND estado = 'ACTIVO'
  `;
  const [rows] = await pool.execute(query, [id, empresaId]);
  return rows[0];
};

export const actualizarProducto = async (id, empresaId, productoData) => {
  const query = `
    UPDATE productos 
    SET codigo = ?, nombre = ?, descripcion = ?, precio = ?, 
        stock = ?, stock_minimo = ?, unidad_medida = ?, categoria = ?,
        codigo_barra = ?, imagen = ?, imagen_nombre = ?, afecto_igv = ?
    WHERE id = ? AND empresa_id = ?
  `;
  
  await pool.execute(query, [
    productoData.codigo,
    productoData.nombre,
    productoData.descripcion,
    productoData.precio,
    productoData.stock,
    productoData.stockMinimo,
    productoData.unidadMedida,
    productoData.categoria,
    productoData.codigoBarra,
    productoData.imagen,
    productoData.imagenNombre,
    productoData.afectoIgv,
    id,
    empresaId
  ]);
};

export const eliminarProducto = async (id, empresaId) => {
  const query = "UPDATE productos SET estado = 'INACTIVO' WHERE id = ? AND empresa_id = ?";
  await pool.execute(query, [id, empresaId]);
};