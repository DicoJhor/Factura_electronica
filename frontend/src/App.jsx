import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { authService } from './services/authService';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Registro from './pages/Registro';
import MisEmpresas from './pages/MisEmpresas';
import FacturasList from './pages/FacturasList';
import ComprobanteForm from './pages/ComprobanteForm';
import ProductosList from './pages/ProductosList';
import './App.css';

// URL del backend — funciona en local, Vercel preview y producción
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
console.log('Backend URL:', API_URL); // ← esto te salva la vida en consola

function App() {
  const [backendOk, setBackendOk] = useState(null); // null = probando, true = ok, false = error
  const isAuthenticated = authService.estaAutenticado();

  // Probar conexión al backend al cargar la app
  useEffect(() => {
    fetch(`${API_URL}/health`) // ← cambia "/health" por cualquier ruta que exista (ej: "/", "/api", "/api/status")
      .then(r => {
        if (r.ok) setBackendOk(true);
        else throw new Error('Respuesta no OK');
      })
      .catch(err => {
        console.error('Backend no responde:', err.message);
        setBackendOk(false);
      });
  }, []);

  // Si el backend está muerto → mostramos pantalla de error amigable
  if (backendOk === false) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <h1>Error de conexión</h1>
        <br />
        <p>No se pudo conectar con el servidor:</p>
        <code style={{ background: '#f0f0f0', padding: '10px', borderRadius: '6px' }}>
          {API_URL}
        </code>
        <p style={{ marginTop: '20px' }}>
          <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', fontSize: '16px' }}>
            Reintentar
          </button>
        </p>
        <small>Si el problema persiste, revisa que tu backend en Render esté encendido.</small>
      </div>
    );
  }

  // Mientras prueba la conexión → pantalla de carga
  if (backendOk === null) {
    return (
      <div style={{ padding: '100px', textAlign: 'center', fontFamily: 'system-ui' }}>
        <h2>Conectando con el servidor...</h2>
        <p>URL: {API_URL}</p>
      </div>
    );
  }

  // Backend OK → mostramos la app normal
  return (
    <BrowserRouter>
      <div className="app-container">
        <main className="app-main">
          <Routes>
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

            <Route
              path="/login"
              element={
                isAuthenticated ? <Navigate to="/empresas" replace /> : <Login />
              }
            />

            <Route
              path="/registro"
              element={
                isAuthenticated ? <Navigate to="/empresas" replace /> : <Registro />
              }
            />

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