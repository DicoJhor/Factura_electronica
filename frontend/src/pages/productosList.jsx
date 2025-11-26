import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { empresaService } from '../services/empresaService';
import api from '../services/api';
import './ProductosList.css';

const ProductosList = () => {
  const { empresaId } = useParams();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState(null);
  const [productos, setProductos] = useState([]);
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);

  useEffect(() => {
    cargarDatos();
  }, [empresaId]);

  useEffect(() => {
    filtrarProductos();
  }, [busqueda, productos]);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [empresaData, productosData] = await Promise.all([
        empresaService.obtenerPorId(empresaId),
        api.get(`/productos/${empresaId}`)
      ]);
      setEmpresa(empresaData);
      setProductos(productosData.data.productos);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('Error al cargar la información');
    } finally {
      setCargando(false);
    }
  };

  const filtrarProductos = () => {
    if (!busqueda.trim()) {
      setProductosFiltrados(productos);
      return;
    }

    const busquedaLower = busqueda.toLowerCase();
    const filtrados = productos.filter(p => 
      p.nombre.toLowerCase().includes(busquedaLower) ||
      p.codigo?.toLowerCase().includes(busquedaLower) ||
      p.descripcion?.toLowerCase().includes(busquedaLower)
    );
    setProductosFiltrados(filtrados);
  };

  const abrirModalNuevo = () => {
    setProductoEditando({
      codigo: '',
      nombre: '',
      descripcion: '',
      precio: '',
      stock: 0,
      stockMinimo: 0,
      unidadMedida: 'NIU',
      categoria: '',
      codigoBarra: '',
      afectoIgv: 'SI'
    });
    setMostrarModal(true);
  };

  const abrirModalEditar = (producto) => {
    setProductoEditando({
      id: producto.id,
      codigo: producto.codigo || '',
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: producto.precio,
      stock: producto.stock || 0,
      stockMinimo: producto.stock_minimo || 0,
      unidadMedida: producto.unidad_medida || 'NIU',
      categoria: producto.categoria || '',
      codigoBarra: producto.codigo_barra || '',
      afectoIgv: producto.afecto_igv || 'SI'
    });
    setMostrarModal(true);
  };

  const cerrarModal = () => {
    setMostrarModal(false);
    setProductoEditando(null);
  };

  const guardarProducto = async (e) => {
    e.preventDefault();
    
    try {
      if (productoEditando.id) {
        await api.put(`/productos/${empresaId}/${productoEditando.id}`, productoEditando);
      } else {
        await api.post(`/productos/${empresaId}`, productoEditando);
      }
      
      cerrarModal();
      cargarDatos();
    } catch (error) {
      console.error('Error al guardar producto:', error);
      alert('Error al guardar el producto');
    }
  };

  const eliminarProducto = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este producto?')) {
      return;
    }

    try {
      await api.delete(`/productos/${empresaId}/${id}`);
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar producto:', error);
      alert('Error al eliminar el producto');
    }
  };

  if (cargando) {
    return (
      <div className="productos-container">
        <div className="loading">⏳ Cargando productos...</div>
      </div>
    );
  }

  return (
    <div className="productos-container">
      <div className="productos-header">
        <div className="header-content">
          <button 
            className="btn-back"
            onClick={() => navigate('/empresas')}
          >
            ← Volver
          </button>
          <div className="empresa-info-header">
            <h1>💰 Lista de Precios</h1>
            <p className="empresa-nombre">{empresa?.razon_social}</p>
            <span className="empresa-ruc">RUC: {empresa?.ruc}</span>
          </div>
        </div>
      </div>

      <div className="productos-content">
        {error && (
          <div className="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        <div className="productos-toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Buscar productos..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <button 
            className="btn btn-primary"
            onClick={abrirModalNuevo}
          >
            ➕ Nuevo Producto
          </button>
        </div>

        {productosFiltrados.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📦</div>
            <h3>No hay productos</h3>
            <p>Agrega tu primer producto para esta empresa</p>
            <button 
              className="btn btn-primary"
              onClick={abrirModalNuevo}
            >
              ➕ Agregar Producto
            </button>
          </div>
        ) : (
          <div className="productos-table">
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Nombre</th>
                  <th>Descripción</th>
                  <th>Precio</th>
                  <th>Stock</th>
                  <th>IGV</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {productosFiltrados.map((producto) => (
                  <tr key={producto.id}>
                    <td>{producto.codigo || '-'}</td>
                    <td className="producto-nombre">{producto.nombre}</td>
                    <td className="producto-descripcion">{producto.descripcion || '-'}</td>
                    <td className="precio">S/ {Number(producto.precio).toFixed(2)}</td>
                    <td className="stock">
                      {producto.stock || 0}
                      {producto.stock <= producto.stock_minimo && (
                        <span className="badge-warning">⚠️</span>
                      )}
                    </td>
                    <td>
                      {producto.afecto_igv === 'SI' ? (
                        <span className="badge badge-success">Sí</span>
                      ) : (
                        <span className="badge badge-secondary">No</span>
                      )}
                    </td>
                    <td className="acciones">
                      <button
                        className="btn-icon btn-edit"
                        onClick={() => abrirModalEditar(producto)}
                        title="Editar"
                      >
                        ✏️
                      </button>
                      <button
                        className="btn-icon btn-delete"
                        onClick={() => eliminarProducto(producto.id)}
                        title="Eliminar"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Producto */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{productoEditando?.id ? '✏️ Editar Producto' : '➕ Nuevo Producto'}</h2>
              <button className="btn-close" onClick={cerrarModal}>✕</button>
            </div>
            
            <form onSubmit={guardarProducto} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Código</label>
                  <input
                    type="text"
                    value={productoEditando.codigo}
                    onChange={(e) => setProductoEditando({...productoEditando, codigo: e.target.value})}
                    placeholder="SKU001"
                  />
                </div>
                <div className="form-group">
                  <label>Código de Barra</label>
                  <input
                    type="text"
                    value={productoEditando.codigoBarra}
                    onChange={(e) => setProductoEditando({...productoEditando, codigoBarra: e.target.value})}
                    placeholder="7501234567890"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Nombre del Producto *</label>
                <input
                  type="text"
                  value={productoEditando.nombre}
                  onChange={(e) => setProductoEditando({...productoEditando, nombre: e.target.value})}
                  placeholder="Nombre del producto"
                  required
                />
              </div>

              <div className="form-group">
                <label>Descripción</label>
                <textarea
                  value={productoEditando.descripcion}
                  onChange={(e) => setProductoEditando({...productoEditando, descripcion: e.target.value})}
                  placeholder="Descripción del producto"
                  rows="3"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Precio *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={productoEditando.precio}
                    onChange={(e) => setProductoEditando({...productoEditando, precio: e.target.value})}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={productoEditando.stock}
                    onChange={(e) => setProductoEditando({...productoEditando, stock: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label>Stock Mínimo</label>
                  <input
                    type="number"
                    min="0"
                    value={productoEditando.stockMinimo}
                    onChange={(e) => setProductoEditando({...productoEditando, stockMinimo: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Unidad de Medida</label>
                  <select
                    value={productoEditando.unidadMedida}
                    onChange={(e) => setProductoEditando({...productoEditando, unidadMedida: e.target.value})}
                  >
                    <option value="NIU">Unidad (NIU)</option>
                    <option value="ZZ">Servicios (ZZ)</option>
                    <option value="KGM">Kilogramo (KGM)</option>
                    <option value="LTR">Litro (LTR)</option>
                    <option value="MTR">Metro (MTR)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Categoría</label>
                  <input
                    type="text"
                    value={productoEditando.categoria}
                    onChange={(e) => setProductoEditando({...productoEditando, categoria: e.target.value})}
                    placeholder="Electrónica, Alimentos, etc."
                  />
                </div>
                <div className="form-group">
                  <label>Afecto a IGV</label>
                  <select
                    value={productoEditando.afectoIgv}
                    onChange={(e) => setProductoEditando({...productoEditando, afectoIgv: e.target.value})}
                  >
                    <option value="SI">Sí</option>
                    <option value="NO">No</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  {productoEditando?.id ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductosList;