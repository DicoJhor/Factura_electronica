// FacturasList.jsx
import { useState, useEffect } from 'react';
import api from '../services/api'; // Ajusta la ruta según tu estructura

const FacturasList = () => {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Cambia '/comprobantes' por '/facturas'
      const response = await api.get('/facturas');
      console.log('✅ Facturas cargadas:', response.data);
      
      setFacturas(response.data);
      
    } catch (error) {
      console.error('❌ Error al cargar datos:', error);
      setError(error.response?.data?.message || 'Error al cargar las facturas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  if (loading) return <div className="loading">Cargando facturas...</div>;
  if (error) return <div className="error">Error: {error}</div>;

  return (
    <div className="facturas-container">
      <h2>Lista de Facturas</h2>
      <table className="facturas-table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Serie-Número</th>
            <th>Cliente</th>
            <th>Fecha Emisión</th>
            <th>Moneda</th>
            <th>Total</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {facturas.length === 0 ? (
            <tr>
              <td colSpan="8" style={{ textAlign: 'center' }}>
                No hay facturas registradas
              </td>
            </tr>
          ) : (
            facturas.map((factura) => (
              <tr key={factura.id}>
                <td>{factura.tipo}</td>
                <td>{factura.serie}-{factura.numero}</td>
                <td>{factura.cliente_nombre || `Cliente #${factura.cliente_id}`}</td>
                <td>{new Date(factura.fecha_emision).toLocaleDateString('es-PE')}</td>
                <td>{factura.moneda}</td>
                <td className="text-right">
                  {factura.moneda} {parseFloat(factura.total).toFixed(2)}
                </td>
                <td>
                  <span className={`badge badge-${factura.estado}`}>
                    {factura.estado}
                  </span>
                </td>
                <td>
                  <button onClick={() => verDetalle(factura.id)}>Ver</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FacturasList;
