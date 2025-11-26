import * as Producto from "../models/productoModel.js";

export const obtenerProductos = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const productos = await Producto.getProductos(empresaId);
    res.json({ productos });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error al obtener productos" });
  }
};

export const crearProducto = async (req, res) => {
  try {
    const { empresaId } = req.params;
    const {
      codigo, nombre, descripcion, precio, stock, stockMinimo,
      unidadMedida, categoria, codigoBarra, afectoIgv
    } = req.body;

    if (!nombre || !precio) {
      return res.status(400).json({ error: 'Nombre y precio son requeridos' });
    }

    let imagen = null;
    let imagenNombre = null;

    if (req.file) {
      imagen = req.file.buffer;
      imagenNombre = req.file.originalname;
    }

    const productoData = {
      empresaId,
      codigo,
      nombre,
      descripcion,
      precio: parseFloat(precio),
      stock: parseInt(stock) || 0,
      stockMinimo: parseInt(stockMinimo) || 0,
      unidadMedida: unidadMedida || 'NIU',
      categoria,
      codigoBarra,
      imagen,
      imagenNombre,
      afectoIgv: afectoIgv || 'SI'
    };

    const productoId = await Producto.crearProducto(productoData);

    res.status(201).json({
      mensaje: 'Producto creado exitosamente',
      productoId
    });
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

export const obtenerProductoPorId = async (req, res) => {
  try {
    const { empresaId, id } = req.params;
    const producto = await Producto.buscarProductoPorId(id, empresaId);

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ producto });
  } catch (error) {
    console.error('Error al obtener producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

export const actualizarProducto = async (req, res) => {
  try {
    const { empresaId, id } = req.params;
    
    const producto = await Producto.buscarProductoPorId(id, empresaId);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const {
      codigo, nombre, descripcion, precio, stock, stockMinimo,
      unidadMedida, categoria, codigoBarra, afectoIgv
    } = req.body;

    let imagen = producto.imagen;
    let imagenNombre = producto.imagen_nombre;

    if (req.file) {
      imagen = req.file.buffer;
      imagenNombre = req.file.originalname;
    }

    const productoData = {
      codigo: codigo || producto.codigo,
      nombre: nombre || producto.nombre,
      descripcion: descripcion || producto.descripcion,
      precio: precio ? parseFloat(precio) : producto.precio,
      stock: stock !== undefined ? parseInt(stock) : producto.stock,
      stockMinimo: stockMinimo !== undefined ? parseInt(stockMinimo) : producto.stock_minimo,
      unidadMedida: unidadMedida || producto.unidad_medida,
      categoria: categoria || producto.categoria,
      codigoBarra: codigoBarra || producto.codigo_barra,
      imagen,
      imagenNombre,
      afectoIgv: afectoIgv || producto.afecto_igv
    };

    await Producto.actualizarProducto(id, empresaId, productoData);

    res.json({ mensaje: 'Producto actualizado exitosamente' });
  } catch (error) {
    console.error('Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

export const eliminarProducto = async (req, res) => {
  try {
    const { empresaId, id } = req.params;
    
    const producto = await Producto.buscarProductoPorId(id, empresaId);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await Producto.eliminarProducto(id, empresaId);

    res.json({ mensaje: 'Producto eliminado exitosamente' });
  } catch (error) {
    console.error('Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};