import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/authService';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login.jsx';
import Registro from './pages/Registro.jsx';
import MisEmpresas from './pages/MisEmpresas.jsx';
import FacturasList from './pages/FacturasList.jsx';
import NuevaEmpresa from './pages/NuevaEmpresa'; // ← NUEVO
import ComprobanteForm from './pages/ComprobanteForm.jsx';
import ProductosList from './pages/productosList.jsx';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app-container">
        <main className="app-main">
          <Routes>
            {/* Rutas públicas */}
            <Route 
              path="/login" 
              element={
                authService.estaAutenticado() ? 
                <Navigate to="/empresas" replace /> : 
                <Login />
              } 
            />
            <Route 
              path="/registro" 
              element={
                authService.estaAutenticado() ? 
                <Navigate to="/empresas" replace /> : 
                <Registro />
              } 
            />

            {/* Rutas protegidas */}
            <Route
              path="/empresas"
              element={
                <ProtectedRoute>
                  <MisEmpresas />
                </ProtectedRoute>
              }
            />
            
            {/* Lista de precios (productos) por empresa */}
            <Route
              path="/productos/:empresaId"
              element={
                <ProtectedRoute>
                  <ProductosList />
                </ProtectedRoute>
              }
            />

            {/* Documentos emitidos por empresa */}
            <Route
              path="/documentos/:empresaId"
              element={
                <ProtectedRoute>
                  <FacturasList />
                </ProtectedRoute>
              }
            />

            {/* Emitir comprobante */}
            <Route
              path="/emitir/:empresaId"
              element={
                <ProtectedRoute>
                  <ComprobanteForm />
                </ProtectedRoute>
              }
            />

            {/* Redirección por defecto */}
            <Route 
              path="*" 
              element={<Navigate to="/empresas" replace />} 
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;