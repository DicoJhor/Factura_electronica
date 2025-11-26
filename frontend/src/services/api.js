import axios from 'axios';

// Detectar automáticamente el entorno
const getBaseURL = () => {
  // Si estamos en producción, usar la URL de Render
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // Si estamos en desarrollo
  if (import.meta.env.DEV) {
    return 'http://localhost:4000/api';
  }
  
  // Fallback
  return 'http://localhost:4000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // 30 segundos (Render puede tardar en despertar)
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para añadir el token a cada petición
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Error 401: Token inválido o expirado
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      // Solo redirigir si no estamos ya en login
      if (currentPath !== '/login' && currentPath !== '/registro') {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        localStorage.removeItem('empresaActiva');
        window.location.href = '/login';
      }
    }
    
    // Error de red o timeout
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      console.error('❌ Error de conexión con el servidor');
    }
    
    return Promise.reject(error);
  }
);

// Función auxiliar para verificar si la API está disponible
export const checkAPIHealth = async () => {
  try {
    const response = await axios.get(`${getBaseURL().replace('/api', '')}/api/health`, {
      timeout: 5000
    });
    return response.data;
  } catch (error) {
    console.error('API Health Check failed:', error);
    return null;
  }
};

export default api;