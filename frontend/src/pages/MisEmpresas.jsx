import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { empresaService } from '../services/empresaService';
import { authService } from '../services/authService';
import './MisEmpresas.css';

const MisEmpresas = () => {
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const usuario = authService.obtenerUsuarioActual();

  useEffect(() => {
    cargarEmpresas();
  }, []);

  const cargarEmpresas = async () => {
    try {
      setCargando(true);
      const data = await empresaService.listar();
      setEmpresas(data);
    } catch (error) {
      console.error('Error al cargar empresas:', error);
      setError('Error al cargar las empresas');
    } finally {
      setCargando(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('¿Seguro que deseas cerrar sesión?')) {
      authService.logout();
    }
  };

  if (cargando) {
    return (
      <div className="empresas-container">
        <div className="loading">⏳ Cargando empresas...</div>
      </div>
    );
  }

  return (
    <div className="empresas-container">
      <div className="empresas-header">
        <div className="header-content">
          <h1>💼 Mis Empresas</h1>
          <div className="header-actions">
            <span className="usuario-info">
              👤 {usuario?.nombre}
            </span>
            <button 
              className="btn btn-secondary"
              onClick={handleLogout}
            >
              🚪 Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      <div className="empresas-content">
        {error && (
          <div className="alert alert-error">
            ⚠️ {error}
          </div>
        )}

        <div className="empresas-grid">
          {empresas.map((empresa) => (
            <div 
              key={empresa.id} 
              className={`empresa-card ${empresa.tipo === 'PRUEBAS' ? 'empresa-pruebas' : ''}`}
            >
              {empresa.tipo === 'PRUEBAS' && (
                <div className="badge badge-desarrollo">DESARROLLO</div>
              )}
              {empresa.es_principal === 'SI' && empresa.tipo !== 'PRUEBAS' && (
                <div className="badge badge-principal">★ PRINCIPAL</div>
              )}

              <div className="empresa-logo">
                {empresa.logo_nombre ? (
                  <img src={`data:image/png;base64,${empresa.logo}`} alt="Logo" />
                ) : (
                  <div className="logo-placeholder">🏢</div>
                )}
              </div>

              <div className="empresa-info">
                <h3>{empresa.razon_social}</h3>
                {empresa.nombre_comercial && empresa.nombre_comercial !== empresa.razon_social && (
                  <p className="nombre-comercial">{empresa.nombre_comercial}</p>
                )}
                <p className="ruc">RUC: {empresa.ruc}</p>
                <p className="direccion">📍 {empresa.direccion_fiscal}</p>
              </div>

              <div className="empresa-actions">
                <button
                  className="btn btn-primary btn-block"
                  onClick={() => navigate(`/productos/${empresa.id}`)}
                >
                  💰 Lista de precios
                </button>
                <button
                  className="btn btn-secondary btn-block"
                  onClick={() => navigate(`/documentos/${empresa.id}`)}
                >
                  📄 Documentos
                </button>
                <button
                  className="btn btn-success btn-block"
                  onClick={() => navigate(`/emitir/${empresa.id}`)}
                >
                  📝 Emitir CPE
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="agregar-empresa-section">
          <button
            className="btn btn-large btn-primary"
            onClick={() => navigate('/empresas/nueva')}
          >
            ➕ Agregar una Empresa
          </button>
        </div>
      </div>
    </div>
  );
};

export default MisEmpresas;