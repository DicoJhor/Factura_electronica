import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

const ProtectedRoute = ({ children }) => {
  const estaAutenticado = authService.estaAutenticado();

  if (!estaAutenticado) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;