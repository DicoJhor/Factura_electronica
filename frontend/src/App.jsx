import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/authService';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Registro from './pages/Registro';
import MisEmpresas from './pages/MisEmpresas';
import FacturasList from './pages/FacturasList';
import ComprobanteForm from './pages/ComprobanteForm';
import ProductosList from './pages/ProductosList';
import './App.css';

function App() {
  const isAuthenticated = authService.estaAutenticado();

  return (
    <BrowserRouter>
      <div className="app-container">
        <main className="app-main">
          <Routes>
            {/* Página raíz: decide a dónde ir según autenticación */}
            <Route
              path="/"
              element={
                isAuthenticated ? (
                  <Navigate to="/empresas" replace />
                ) : (
                  <Navigate to="/login" replace />
                )
              }
            />

            {/* Login */}
            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/empresas" replace /> : <Login />
              }
            />

            {/* Registro */}
            <Route
              path="/registro"
              element={
                isAuthenticated ? <Navigate to="/empresas" replace /> : <Registro />
              }
            />

            {/* === RUTAS PROTEGIDAS === */}
            <Route
              path="/empresas"
              element={
                <ProtectedRoute>
                  <MisEmpresas />
                </ProtectedRoute>
              }
            />

            <Route
              path="/productos/:empresaId"
              element={
                <ProtectedRoute>
                  <ProductosList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/documentos/:empresaId"
              element={
                <ProtectedRoute>
                  <FacturasList />
                </ProtectedRoute>
              }
            />

            <Route
              path="/emitir/:empresaId"
              element={
                <ProtectedRoute>
                  <ComprobanteForm />
                </ProtectedRoute>
              }
            />

            {/* Cualquier otra ruta → si está logueado va a empresas, si no al login */}
            <Route
              path="*"
              element={
                <Navigate to={isAuthenticated ? "/empresas" : "/login"} replace />
              }
            />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;