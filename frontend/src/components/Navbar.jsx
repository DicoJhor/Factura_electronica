import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import './Navbar.css';

const Navbar = ({ empresaNombre, empresaRuc, showBackButton = false, backUrl = '/empresas' }) => {
  const navigate = useNavigate();
  const usuario = authService.obtenerUsuarioActual();

  const handleLogout = () => {
    if (window.confirm('¿Seguro que deseas cerrar sesión?')) {
      authService.logout();
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-content">
        <div className="navbar-left">
          {showBackButton && (
            <button 
              className="btn-back-nav"
              onClick={() => navigate(backUrl)}
            >
              ← Volver
            </button>
          )}
          <div className="navbar-brand">
            <h1>🧾 Facturador</h1>
            {empresaNombre && (
              <div className="empresa-info-nav">
                <span className="empresa-nombre-nav">{empresaNombre}</span>
                {empresaRuc && (
                  <span className="empresa-ruc-nav">RUC: {empresaRuc}</span>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="navbar-right">
          <span className="usuario-info-nav">
            👤 {usuario?.nombre}
          </span>
          <button 
            className="btn-logout"
            onClick={handleLogout}
          >
            🚪 Salir
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;