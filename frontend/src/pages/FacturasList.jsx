import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { empresaService } from '../services/empresaService';
import { facturaService } from '../services/facturaService';
import Navbar from '../components/Navbar';
import './FacturasList.css';

const FacturasList = () => {
  const { empresaId } = useParams();
  const navigate = useNavigate();
  const [empresa, setEmpresa] = useState(null);
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => {
    cargarDatos();
  }, [empresaId]);

  const cargarDatos = async () => {
    try {
      setCargando(true);
      const [empresaData, facturasData] = await Promise.all([
        empresaService.obtenerPorId(empresaId),
        facturaService.listar(empresaId)
      ]);
      setEmpresa(empresaData);
      setFacturas(facturasData);
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError('Error al cargar los documentos');
    } finally {
      setCargando(false);
    }
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatearMoneda = (monto) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(monto || 0);
  };

  const facturasFiltradas = facturas.filter(f => 
    !busqueda.trim() || 
    f.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    f.cliente_documento?.includes(busqueda) ||
    f.serie?.includes(busqueda) ||
    f.numero?.toString().includes(busqueda)
  );

  if (cargando) {
    return (
      <div className="facturas-container">
        <Navbar 
          empresaNombre={null}
          showBackButton={true}
        />
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando documentos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="facturas-container">
      <Navbar 
        empresaNombre={empresa?.razon_social}
        empresaRuc={empresa?.ruc}
        showBackButton={true}
      />

      <div className="facturas-content">
        <div className="facturas-header-section">
          <h2>📄 Documentos Emitidos</h2>
          <button 
            className="btn btn-primary"
            onClick={() => navigate(`/emitir/${empresaId}`)}
          >
            ➕ Emitir Comprobante
          </button>
        </div>

        {error && (
          <div className="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        <div className="facturas-toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="🔍 Buscar por cliente, documento, serie o número..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="facturas-stats">
            <span className="stat-item">
              Total: <strong>{facturasFiltradas.length}</strong> documentos
            </span>
          </div>
        </div>

        {facturasFiltradas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No hay documentos</h3>
            <p>
              {busqueda ? 
                'No se encontraron resultados para tu búsqueda' :
                'Aún no has emitido comprobantes para esta empresa'
              }
            </p>
            <button 
              className="btn btn-primary"
              onClick={() => navigate(`/emitir/${empresaId}`)}
            >
              ➕ Emitir Primer Comprobante
            </button>
          </div>
        ) : (
          <div className="facturas-table">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Serie-Número</th>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>RUC/DNI</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturasFiltradas.map((factura) => (
                  <tr key={factura.id}>
                    <td>
                      <span className={`badge badge-tipo badge-tipo-${factura.tipo}`}>
                        {factura.tipo === '01' ? 'Factura' :
                         factura.tipo === '03' ? 'Boleta' :
                         factura.tipo === '07' ? 'N. Crédito' :
                         factura.tipo === '08' ? 'N. Débito' : 'Otro'}
                      </span>
                    </td>
                    <td className="serie-numero">
                      {factura.serie}-{String(factura.numero).padStart(8, '0')}
                    </td>
                    <td>{formatearFecha(factura.fecha_emision)}</td>
                    <td className="cliente-nombre">{factura.cliente_nombre || '-'}</td>
                    <td>{factura.cliente_documento || '-'}</td>
                    <td className="precio">{formatearMoneda(factura.total)}</td>
                    <td>
                      <span className={`badge badge-estado badge-${factura.estado?.toLowerCase()}`}>
                        {factura.estado || 'PENDIENTE'}
                      </span>
                    </td>
                    <td className="acciones">
                      {factura.pdf && (
                        
                          href={`http://localhost:4000${factura.pdf}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-icon btn-pdf"
                          title="Ver PDF"
                        >
                          📄
                        </a>
                      )}
                      {factura.xml_firmado && (
                        <button
                          className="btn-icon btn-xml"
                          title="Descargar XML"
                        >
                          📑
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FacturasList;