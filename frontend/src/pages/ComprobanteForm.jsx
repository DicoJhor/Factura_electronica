import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { empresaService } from '../services/empresaService';
import { facturaService } from '../services/facturaService';
import Navbar from '../components/Navbar';
import './ComprobanteForm.css';

const ComprobanteForm = () => {
  const { empresaId } = useParams();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  // Estados del formulario
  const [tipoComprobante, setTipoComprobante] = useState('03'); // Boleta por defecto
  const [serie, setSerie] = useState('B001');
  const [numero, setNumero] = useState(''); // Ya no se enviará
  const [tipoDocCliente, setTipoDocCliente] = useState('DNI');
  const [numeroDocCliente, setNumeroDocCliente] = useState('');
  const [nombreCliente, setNombreCliente] = useState('');
  const [direccionCliente, setDireccionCliente] = useState('');
  const [items, setItems] = useState([
    { descripcion: '', cantidad: 1, precioUnitario: 0, total: 0 }
  ]);
  const [observaciones, setObservaciones] = useState('');

  useEffect(() => {
    cargarEmpresa();
  }, [empresaId]);

  useEffect(() => {
    if (tipoComprobante === '01') setSerie('F001');
    else if (tipoComprobante === '03') setSerie('B001');
  }, [tipoComprobante]);

  const cargarEmpresa = async () => {
    try {
      const data = await empresaService.obtenerPorId(empresaId);
      setEmpresa(data);
    } catch (error) {
      console.error('Error al cargar empresa:', error);
      setError('Error al cargar los datos de la empresa');
    }
  };

  const consultarSunat = async () => {
    if (!numeroDocCliente || numeroDocCliente.length < 8) {
      setError('Ingresa un número de documento válido');
      return;
    }
    try {
      setCargando(true);
      setError('');
      const data = await facturaService.consultarSunat(numeroDocCliente);

      if (data.nombre) {
        setNombreCliente(data.nombre);
        setDireccionCliente(data.direccion || '');
        setExito('✓ Datos obtenidos de SUNAT');
        setTimeout(() => setExito(''), 3000);
      } else {
        setError('No se encontraron datos en SUNAT');
      }
    } catch (error) {
      console.error('Error al consultar SUNAT:', error);
      setError('Error al consultar SUNAT. Ingresa los datos manualmente.');
    } finally {
      setCargando(false);
    }
  };

  const agregarItem = () => {
    setItems([...items, { descripcion: '', cantidad: 1, precioUnitario: 0, total: 0 }]);
  };

  const eliminarItem = (index) => {
    if (items.length > 1) {
      const nuevosItems = items.filter((_, i) => i !== index);
      setItems(nuevosItems);
    }
  };

  const actualizarItem = (index, campo, valor) => {
    const nuevosItems = [...items];
    nuevosItems[index][campo] = valor;

    if (campo === 'cantidad' || campo === 'precioUnitario') {
      const cantidad = parseFloat(nuevosItems[index].cantidad) || 0;
      const precio = parseFloat(nuevosItems[index].precioUnitario) || 0;
      nuevosItems[index].total = cantidad * precio;
    }

    setItems(nuevosItems);
  };

  const calcularTotales = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
    const igv = subtotal * 0.18;
    const total = subtotal + igv;
    return { subtotal, igv, total };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setExito('');

    if (!nombreCliente.trim()) {
      setError('El nombre del cliente es requerido');
      return;
    }

    if (items.length === 0 || !items[0].descripcion) {
      setError('Debes agregar al menos un item');
      return;
    }

    const { subtotal, igv, total } = calcularTotales();
    if (total <= 0) {
      setError('El total debe ser mayor a 0');
      return;
    }

    try {
      setCargando(true);

      const facturaData = {
        tipo: tipoComprobante,
        serie,
        cliente: {
          tipoDoc: tipoDocCliente,
          numeroDoc: numeroDocCliente,
          nombre: nombreCliente,
          direccion: direccionCliente
        },
        detalles: items.map(item => ({
          descripcion: item.descripcion,
          cantidad: parseFloat(item.cantidad),
          precio_unitario: parseFloat(item.precioUnitario)
        })),
        subtotal,
        igv,
        total,
        observaciones
      };

      await facturaService.emitir(empresaId, facturaData);

      setExito('✓ Comprobante emitido correctamente');

      setTimeout(() => {
        navigate(`/documentos/${empresaId}`);
      }, 2000);
    } catch (error) {
      console.error('Error al emitir comprobante:', error);
      setError(error.response?.data?.message || 'Error al emitir el comprobante');
    } finally {
      setCargando(false);
    }
  };

  const { subtotal, igv, total } = calcularTotales();

  return (
    <div className="comprobante-container">
      <Navbar 
        empresaNombre={empresa?.razon_social}
        empresaRuc={empresa?.ruc}
        showBackButton={true}
        backUrl={`/documentos/${empresaId}`}
      />

      <div className="comprobante-content">
        <div className="comprobante-header">
          <h2>✍️ Emitir Comprobante Electrónico</h2>
        </div>

        {error && <div className="alert alert-error">⚠️ {error}</div>}
        {exito && <div className="alert alert-success">{exito}</div>}

        <form onSubmit={handleSubmit} className="comprobante-form">
          {/* Tipo de Comprobante */}
          <div className="form-section">
            <h3>📋 Tipo de Comprobante</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Tipo *</label>
                <select 
                  value={tipoComprobante} 
                  onChange={(e) => setTipoComprobante(e.target.value)}
                  required
                >
                  <option value="01">Factura</option>
                  <option value="03">Boleta</option>
                  <option value="07">Nota de Crédito</option>
                  <option value="08">Nota de Débito</option>
                </select>
              </div>
              <div className="form-group">
                <label>Serie *</label>
                <input 
                  type="text" 
                  value={serie}
                  onChange={(e) => setSerie(e.target.value)}
                  placeholder="B001"
                  maxLength={4}
                  required
                />
              </div>
              <div className="form-group">
                <label>Número (opcional)</label>
                <input 
                  type="number" 
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Se generará automáticamente"
                  disabled
                />
              </div>
            </div>
          </div>

          {/* Datos del Cliente */}
          <div className="form-section">
            <h3>👤 Datos del Cliente</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Tipo de Documento *</label>
                <select 
                  value={tipoDocCliente} 
                  onChange={(e) => setTipoDocCliente(e.target.value)}
                  required
                >
                  <option value="DNI">DNI</option>
                  <option value="RUC">RUC</option>
                  <option value="CE">Carnet de Extranjería</option>
                  <option value="PASS">Pasaporte</option>
                </select>
              </div>
              <div className="form-group form-group-with-button">
                <label>Número de Documento *</label>
                <div className="input-with-button">
                  <input 
                    type="text" 
                    value={numeroDocCliente}
                    onChange={(e) => setNumeroDocCliente(e.target.value)}
                    placeholder={tipoDocCliente === 'DNI' ? '12345678' : '20123456789'}
                    maxLength={tipoDocCliente === 'DNI' ? 8 : 11}
                    required
                  />
                  <button 
                    type="button" 
                    onClick={consultarSunat}
                    className="btn-consultar"
                    disabled={cargando}
                  >
                    🔍 Consultar
                  </button>
                </div>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Nombre/Razón Social *</label>
                <input 
                  type="text" 
                  value={nombreCliente}
                  onChange={(e) => setNombreCliente(e.target.value)}
                  placeholder="Nombre completo o razón social"
                  required
                />
              </div>
              <div className="form-group">
                <label>Dirección</label>
                <input 
                  type="text" 
                  value={direccionCliente}
                  onChange={(e) => setDireccionCliente(e.target.value)}
                  placeholder="Dirección del cliente"
                />
              </div>
            </div>
          </div>

          {/* Items/Productos */}
          <div className="form-section">
            <div className="items-header">
              <h3>🛒 Detalle de Items</h3>
              <button 
                type="button" 
                onClick={agregarItem}
                className="btn btn-secondary"
              >
                ➕ Agregar Item
              </button>
            </div>
            
            <div className="items-list">
              {items.map((item, index) => (
                <div key={index} className="item-row">
                  <div className="item-number">{index + 1}</div>
                  <div className="item-fields">
                    <input 
                      type="text" 
                      placeholder="Descripción del producto/servicio"
                      value={item.descripcion}
                      onChange={(e) => actualizarItem(index, 'descripcion', e.target.value)}
                      required
                    />
                    <input 
                      type="number" 
                      placeholder="Cant."
                      min="1"
                      step="1"
                      value={item.cantidad}
                      onChange={(e) => actualizarItem(index, 'cantidad', e.target.value)}
                      required
                    />
                    <input 
                      type="number" 
                      placeholder="Precio Unit."
                      min="0"
                      step="0.01"
                      value={item.precioUnitario}
                      onChange={(e) => actualizarItem(index, 'precioUnitario', e.target.value)}
                      required
                    />
                    <div className="item-total">
                      S/ {item.total.toFixed(2)}
                    </div>
                  </div>
                  {items.length > 1 && (
                    <button 
                      type="button" 
                      onClick={() => eliminarItem(index)}
                      className="btn-eliminar-item"
                      title="Eliminar item"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Observaciones */}
          <div className="form-section">
            <h3>📝 Observaciones</h3>
            <textarea 
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Observaciones adicionales (opcional)"
              rows={3}
            />
          </div>

          {/* Totales */}
          <div className="totales-section">
            <div className="totales-box">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>S/ {subtotal.toFixed(2)}</span>
              </div>
              <div className="total-row">
                <span>IGV (18%):</span>
                <span>S/ {igv.toFixed(2)}</span>
              </div>
              <div className="total-row total-final">
                <span>Total:</span>
                <span>S/ {total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="form-actions">
            <button 
              type="button" 
              onClick={() => navigate(`/documentos/${empresaId}`)}
              className="btn btn-secondary"
              disabled={cargando}
            >
              ← Cancelar
            </button>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={cargando}
            >
              {cargando ? '⏳ Emitiendo...' : '✓ Emitir Comprobante'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComprobanteForm;
